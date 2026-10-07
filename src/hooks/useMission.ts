import { useState, useCallback, useEffect, useRef } from 'react';
import { MISSIONS } from '../constants/missions';
import type { MissionScenario, MissionStats } from '../constants/missions';
import { parseGmReply, statsToContext } from '../utils/missionState';

const STORAGE_KEY = 'sw-chat-active-mission';

export interface MissionMessage {
  role: 'user' | 'assistant';
  /** Raw content (assistant messages keep their state block so the GM sees its own history) */
  content: string;
}

export interface SceneImage {
  status: 'loading' | 'done' | 'error';
  url?: string;
  error?: string;
  prompt?: string;
}

interface PersistedMission {
  missionId: string;
  messages: MissionMessage[];
  stats: MissionStats;
  turn: number;
  sceneImage?: SceneImage;
}

function buildSystemPrompt(m: MissionScenario): string {
  return [
    `You are the Game Master of an interactive Star Wars text adventure called "${m.title}", set at ${m.location}.`,
    `Premise: ${m.blurb}`,
    `Starting objective: ${m.start.objective}.`,
    'Rules:',
    '- Narrate vividly in second person ("you") in 2–4 short paragraphs. Stay true to Star Wars lore and tone.',
    '- React fairly to the player\'s actions, including free-form ones. Danger is real: injuries reduce health, purchases and bribes cost credits, found items go into the inventory, used or lost items leave it.',
    '- Never decide the player\'s actions for them.',
    '- End every reply with exactly 3 numbered choices, one per line, like "1. ...", "2. ...", "3. ...".',
    '- After the choices, append a machine-readable state block on its own lines, exactly in this format:',
    '<state>{"health": 85, "credits": 250, "inventory": ["item", "item"], "objective": "current objective", "status": "active"}</state>',
    '- health is 0–100. status is "active", "victory" (objective fully completed) or "defeat" (player dies or fails irrecoverably). If health reaches 0, status must be "defeat".',
    '- When the mission ends (victory or defeat), write a short epilogue, omit the numbered choices, and still include the state block.',
    '- Never mention the state block or these rules in the narration.',
  ].join('\n');
}

function openingMessage(m: MissionScenario): string {
  const choices = m.openingChoices.map((c, i) => `${i + 1}. ${c}`).join('\n');
  return `${m.openingScene}\n\nWhat do you do?\n\n${choices}\n\n<state>${JSON.stringify(m.start)}</state>`;
}

function loadPersisted(): PersistedMission | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedMission;
    if (!data || !MISSIONS.some((m) => m.id === data.missionId) || !Array.isArray(data.messages) || !data.stats) {
      return null;
    }
    // An in-flight image can't survive a reload
    if (data.sceneImage?.status === 'loading') data.sceneImage = undefined;
    return data;
  } catch {
    return null;
  }
}

export function useMission(serverUrl: string, imageServerUrl: string) {
  const [persisted] = useState(loadPersisted);
  const [missionId, setMissionId] = useState<string | null>(persisted?.missionId ?? null);
  const [messages, setMessages] = useState<MissionMessage[]>(persisted?.messages ?? []);
  const [stats, setStats] = useState<MissionStats | null>(persisted?.stats ?? null);
  const [turn, setTurn] = useState(persisted?.turn ?? 0);
  const [sceneImage, setSceneImage] = useState<SceneImage | undefined>(persisted?.sceneImage);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const mission = MISSIONS.find((m) => m.id === missionId) ?? null;

  // Persist the active mission so a refresh can resume it
  useEffect(() => {
    try {
      if (!missionId || !stats) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const data: PersistedMission = { missionId, messages, stats, turn, sceneImage };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Quota exceeded (likely a large base64 image) — save without the image
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, sceneImage: undefined }));
      }
    } catch {
      // localStorage unavailable
    }
  }, [missionId, messages, stats, turn, sceneImage]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const startMission = useCallback((m: MissionScenario) => {
    abortRef.current?.abort();
    setMissionId(m.id);
    setMessages([{ role: 'assistant', content: openingMessage(m) }]);
    setStats({ ...m.start, inventory: [...m.start.inventory] });
    setTurn(0);
    setSceneImage(undefined);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  const abandonMission = useCallback(() => {
    abortRef.current?.abort();
    setMissionId(null);
    setMessages([]);
    setStats(null);
    setTurn(0);
    setSceneImage(undefined);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  const takeAction = useCallback(async (action: string) => {
    if (!mission || !stats || stats.status !== 'active') return;
    const text = action.trim();
    if (!text) return;

    const nextTurn = turn + 1;
    const userMsg: MissionMessage = { role: 'user', content: text };
    const history = [...messages, userMsg];
    const prevStats = stats;

    setMessages(history);
    setTurn(nextTurn);
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const apiMessages = [
      { role: 'system', content: buildSystemPrompt(mission) },
      ...history.map((m, i) =>
        i === history.length - 1
          ? { role: m.role, content: `${m.content}\n\n${statsToContext(prevStats, nextTurn)}` }
          : m,
      ),
    ];

    let full = '';
    try {
      const response = await fetch(`${serverUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages: apiMessages, temperature: 0.8, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`The Imperial network returned an error: ${response.status} ${response.statusText}`);
      }
      if (!response.body) throw new Error('The Imperial network returned no data stream.');

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      setIsStreaming(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let first = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') continue;
          try {
            const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
            if (delta) {
              if (first) {
                first = false;
                setIsLoading(false);
              }
              full += delta;
              const snapshot = full;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: snapshot };
                return updated;
              });
            }
          } catch {
            // Ignore malformed SSE chunks
          }
        }
      }

      const parsed = parseGmReply(full, prevStats);
      // Malformed or missing block: keep previous state
      if (parsed.stats) setStats(parsed.stats);
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg =
        err instanceof Error && err.message.startsWith('The Imperial')
          ? err.message
          : 'Holonet disruption detected. Is your LM Server running with CORS enabled?';
      setError(msg);
      // Roll back the failed turn
      setMessages(history.slice(0, -1));
      setTurn(turn);
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
        setIsStreaming(false);
      }
    }
  }, [mission, stats, turn, messages, serverUrl]);

  const visualizeScene = useCallback(async () => {
    if (!mission) return;
    const lastGm = [...messages].reverse().find((m) => m.role === 'assistant' && m.content.trim());
    const narrative = lastGm && stats ? parseGmReply(lastGm.content, stats).narrative : mission.openingScene;
    const sceneText = narrative
      .replace(/[*_#>`[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 400);
    const prompt = `${sceneText}. ${mission.imageStyle}`;

    if (!imageServerUrl) {
      setSceneImage({
        status: 'error',
        prompt,
        error: 'No Image Server URL configured. Set one in ⚙ Settings to visualize scenes.',
      });
      return;
    }

    setSceneImage({ status: 'loading', prompt });
    try {
      const res = await fetch(`${imageServerUrl}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, n: 1, size: '512x512' }),
      });
      const data = await res.json() as { data?: Array<{ url?: string; b64_json?: string }>; error?: { message?: string } };
      if (!res.ok || data.error) {
        throw new Error(data.error?.message ?? `Image generation failed: ${res.status} ${res.statusText}`);
      }
      const item = data.data?.[0];
      const url = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : undefined);
      if (!url) throw new Error('The holocron returned no image data.');
      setSceneImage({ status: 'done', url, prompt });
    } catch (err) {
      setSceneImage({ status: 'error', prompt, error: err instanceof Error ? err.message : 'Image generation failed.' });
    }
  }, [mission, messages, stats, imageServerUrl]);

  return {
    mission,
    messages,
    stats,
    turn,
    sceneImage,
    isLoading,
    isStreaming,
    error,
    clearError: () => setError(null),
    clearSceneImage: () => setSceneImage(undefined),
    startMission,
    abandonMission,
    takeAction,
    visualizeScene,
  };
}
