import { useState, useCallback, useRef, useEffect } from 'react';
import type { Persona } from '../types/chat';
import type { ModelSettings } from '../types/modelSettings';
import { streamChatCompletion, type ChatCompletionMessage } from '../utils/debateStream';

export type DebateSide = 'a' | 'b';
export type DebateSpeaker = DebateSide | 'moderator';

export interface DebateEntry {
  id: string;
  speaker: DebateSpeaker;
  content: string;
  round?: number;
  streaming?: boolean;
  interrupted?: boolean;
}

export interface DebateConfig {
  a: Persona;
  b: Persona;
  topic: string;
  rounds: number;
}

export type DebateStatus = 'idle' | 'running' | 'stopped' | 'done';

let entrySeq = 0;
const newId = () => `deb-${Date.now()}-${entrySeq++}`;

function buildMessages(config: DebateConfig, speaker: DebateSide, entries: DebateEntry[]): ChatCompletionMessage[] {
  const self = speaker === 'a' ? config.a : config.b;
  const other = speaker === 'a' ? config.b : config.a;
  const otherLabel = config.a.name === config.b.name ? `${other.name} (opponent)` : other.name;

  const system =
    `${self.systemPrompt}\n\n` +
    `You are taking part in a formal debate against ${otherLabel} on the topic: "${config.topic}". ` +
    `Stay fully in character. Respond directly to your opponent's latest points and advance your own argument. ` +
    `Lines from your opponent are prefixed with their name; lines prefixed "Moderator:" come from the debate moderator — heed them. ` +
    `Speak only as yourself: do not write lines for anyone else and do not prefix your reply with your own name. ` +
    `Keep each turn concise — one to three short paragraphs.`;

  const raw: ChatCompletionMessage[] = [];
  for (const e of entries) {
    if (!e.content.trim()) continue;
    if (e.speaker === 'moderator') {
      raw.push({ role: 'user', content: `Moderator: ${e.content}` });
    } else if (e.speaker === speaker) {
      raw.push({ role: 'assistant', content: e.content });
    } else {
      raw.push({ role: 'user', content: `${otherLabel}: ${e.content}` });
    }
  }

  // Some chat templates require the turn to end on a user message
  if (raw.length === 0 || raw[raw.length - 1].role === 'assistant') {
    raw.push({ role: 'user', content: `Moderator: ${self.name}, please continue.` });
  }

  // Merge consecutive same-role messages (strict templates require alternation)
  const merged: ChatCompletionMessage[] = [];
  for (const m of raw) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n\n${m.content}`;
    } else {
      merged.push({ ...m });
    }
  }

  // Templates also generally expect the first non-system message to be from the user
  if (merged[0]?.role === 'assistant') {
    merged.unshift({ role: 'user', content: `Moderator: The topic is "${config.topic}".` });
  }

  return [{ role: 'system', content: system }, ...merged];
}

export function useDebate(serverUrl: string, getSettings?: (persona: Persona) => ModelSettings) {
  const getSettingsRef = useRef(getSettings);
  useEffect(() => { getSettingsRef.current = getSettings; }, [getSettings]);

  const [entries, setEntriesState] = useState<DebateEntry[]>([]);
  const [status, setStatus] = useState<DebateStatus>('idle');
  const [config, setConfig] = useState<DebateConfig | null>(null);
  const [turnsDone, setTurnsDone] = useState(0);
  const [totalTurns, setTotalTurns] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const entriesRef = useRef<DebateEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const turnsDoneRef = useRef(0);

  const setEntries = useCallback((updater: (prev: DebateEntry[]) => DebateEntry[]) => {
    entriesRef.current = updater(entriesRef.current);
    setEntriesState(entriesRef.current);
  }, []);

  // Abort any in-flight turn on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const runTurns = useCallback(
    async (cfg: DebateConfig, total: number) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus('running');
      setError(null);

      while (turnsDoneRef.current < total) {
        const turn = turnsDoneRef.current;
        const speaker: DebateSide = turn % 2 === 0 ? 'a' : 'b';
        const messages = buildMessages(cfg, speaker, entriesRef.current);
        const id = newId();
        setEntries((prev) => [...prev, { id, speaker, content: '', round: Math.floor(turn / 2) + 1, streaming: true }]);

        try {
          await streamChatCompletion(
            messages,
            serverUrl,
            (text) => setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content: text } : e))),
            controller.signal,
            getSettingsRef.current?.(speaker === 'a' ? cfg.a : cfg.b),
          );
          if (abortRef.current !== controller) return;
          setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content: e.content.trim(), streaming: false } : e)));
          turnsDoneRef.current = turn + 1;
          setTurnsDone(turn + 1);
        } catch (err) {
          const aborted = controller.signal.aborted;
          // Superseded by a reset or a new debate — leave state alone
          if (abortRef.current !== controller) return;
          setEntries((prev) =>
            prev
              .map((e) => (e.id === id ? { ...e, streaming: false, interrupted: aborted && !!e.content } : e))
              .filter((e) => e.id !== id || !!e.content),
          );
          if (!aborted) {
            setError(
              err instanceof Error && err.message.startsWith('The Imperial')
                ? err.message
                : 'Holonet disruption detected. Is your LM Server running with CORS enabled?',
            );
          }
          setStatus('stopped');
          abortRef.current = null;
          return;
        }

        if (controller.signal.aborted) {
          if (abortRef.current === controller) {
            abortRef.current = null;
            setStatus('stopped');
          }
          return;
        }
      }

      if (abortRef.current !== controller) return;
      abortRef.current = null;
      setStatus('done');
    },
    [serverUrl, setEntries],
  );

  const start = useCallback(
    (cfg: DebateConfig) => {
      abortRef.current?.abort();
      const total = cfg.rounds * 2;
      setConfig(cfg);
      turnsDoneRef.current = 0;
      setTurnsDone(0);
      setTotalTurns(total);
      setEntries(() => [
        {
          id: newId(),
          speaker: 'moderator',
          content: `The topic is "${cfg.topic}". ${cfg.a.name}, give your opening statement. ${cfg.b.name} will respond.`,
        },
      ]);
      void runTurns(cfg, total);
    },
    [runTurns, setEntries],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** Resume a stopped debate, or extend a finished one by `extraRounds`. */
  const resume = useCallback(
    (extraRounds = 0) => {
      if (!config || status === 'running') return;
      const total = totalTurns + extraRounds * 2;
      setTotalTurns(total);
      if (extraRounds > 0) setConfig({ ...config, rounds: config.rounds + extraRounds });
      void runTurns(config, total);
    },
    [config, status, totalTurns, runTurns],
  );

  const addModeratorMessage = useCallback(
    (content: string) => {
      const text = content.trim();
      if (!text) return;
      setEntries((prev) => [...prev, { id: newId(), speaker: 'moderator', content: text }]);
    },
    [setEntries],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setEntries(() => []);
    setConfig(null);
    setStatus('idle');
    setError(null);
    turnsDoneRef.current = 0;
    setTurnsDone(0);
    setTotalTurns(0);
  }, [setEntries]);

  return {
    entries,
    status,
    config,
    turnsDone,
    totalTurns,
    error,
    clearError: () => setError(null),
    start,
    stop,
    resume,
    addModeratorMessage,
    reset,
  };
}
