import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, ChatError } from '../types/chat';
import { applyPreferencesSection } from '../utils/preferenceNotes';
import type { ModelSettings, GenerationStats } from '../types/modelSettings';
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from '../types/modelSettings';

interface UseChatApiReturn {
  messages: Message[];
  isLoading: boolean;
  error: ChatError | null;
  sendMessage: (userContent: string, serverUrl: string) => Promise<void>;
  sendImageMessage: (prompt: string, imageServerUrl: string) => Promise<void>;
  clearError: () => void;
  clearChat: () => void;
  restoreMessages: (restored: Message[]) => void;
  /** Learned-preferences section appended to the system message at send time (no chat reset). */
  setPreferencesSection: (section: string) => void;
  /** Timing / throughput stats for the most recent completed response */
  lastStats: GenerationStats | null;
}

export function useChatApi(systemPromptContent: string, modelSettings?: ModelSettings): UseChatApiReturn {
  const [lastStats, setLastStats] = useState<GenerationStats | null>(null);
  const modelSettingsRef = useRef<ModelSettings | undefined>(modelSettings);
  useEffect(() => { modelSettingsRef.current = modelSettings; }, [modelSettings]);
  const [messages, setMessages] = useState<Message[]>([{ role: 'system', content: systemPromptContent }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const skipNextResetRef = useRef(false);
  const preferencesSectionRef = useRef('');
  const setPreferencesSection = useCallback((section: string) => { preferencesSectionRef.current = section; }, []);

  // Reset chat whenever the persona (system prompt) changes,
  // unless a session restore has flagged to skip it.
  useEffect(() => {
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }
    setMessages([{ role: 'system', content: systemPromptContent }]);
    setError(null);
  }, [systemPromptContent]);

  const clearError = useCallback(() => setError(null), []);

  const clearChat = useCallback(() => {
    setMessages([{ role: 'system', content: systemPromptContent }]);
    setError(null);
  }, [systemPromptContent]);

  const sendMessage = useCallback(async (userContent: string, serverUrl: string) => {
    const userMessage: Message = { role: 'user', content: userContent };
    // Strip image-only messages before sending to the LLM
    const chatHistory = applyPreferencesSection([...messages.filter((m) => !m.imageStatus), userMessage], preferencesSectionRef.current);

    setMessages(chatHistory);
    setIsLoading(true);
    setError(null);

    const settings = modelSettingsRef.current ?? {};
    const requestedModel = settings.model || DEFAULT_MODEL;
    const startedAt = performance.now();
    let firstTokenAt = 0;
    let chunkCount = 0;
    let charCount = 0;
    let usageTokens: number | null = null;
    let reportedModel: string | null = null;

    try {
      const response = await fetch(`${serverUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: requestedModel,
          messages: chatHistory,
          temperature: settings.temperature ?? DEFAULT_TEMPERATURE,
          ...(settings.maxTokens ? { max_tokens: settings.maxTokens } : {}),
          stream: true,
          stream_options: { include_usage: true },
        }),
      });

      if (!response.ok) {
        throw new Error(`The Imperial network returned an error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('The Imperial network returned no data stream.');
      }

      // Add an empty assistant placeholder that we'll stream into
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedFirstChunk = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep any incomplete trailing line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            if (typeof parsed.model === 'string' && parsed.model) reportedModel = parsed.model;
            if (typeof parsed.usage?.completion_tokens === 'number') usageTokens = parsed.usage.completion_tokens;
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              if (!firstTokenAt) firstTokenAt = performance.now();
              chunkCount += 1;
              charCount += delta.length;
              // Hide the loading indicator as soon as the first token arrives
              if (!receivedFirstChunk) {
                receivedFirstChunk = true;
                setIsLoading(false);
              }
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + delta };
                return updated;
              });
            }
          } catch {
            // Ignore malformed SSE chunks
          }
        }
      }

      // Generation stats: prefer server-reported usage, else approximate (chars/4, at least chunk count)
      if (firstTokenAt) {
        const endedAt = performance.now();
        const tokens = usageTokens ?? Math.max(chunkCount, Math.round(charCount / 4));
        const genSeconds = Math.max((endedAt - firstTokenAt) / 1000, 0.001);
        setLastStats({
          ttftMs: firstTokenAt - startedAt,
          tokensPerSec: tokens / genSeconds,
          tokens,
          exactTokens: usageTokens !== null,
          model: reportedModel ?? requestedModel,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message.startsWith('The Imperial')
          ? err.message
          : 'Holonet disruption detected. Is your LM Server running with CORS enabled?';
      setError({ message });
      // Roll back to before the user message (and any partial assistant message)
      setMessages(() => chatHistory.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const sendImageMessage = useCallback(async (prompt: string, imageServerUrl: string) => {
    const userMsg: Message = { role: 'user', content: `/image ${prompt}` };
    const placeholder: Message = { role: 'assistant', content: '', imageStatus: 'loading', imagePrompt: prompt };
    setMessages((prev) => [...prev, userMsg, placeholder]);

    try {
      if (!imageServerUrl) {
        throw new Error(
          'No Image Server URL configured. Set one in ⚙ Settings — point it at ComfyUI, AUTOMATIC1111, or any OpenAI-compatible image API. LM Studio does not support image generation.',
        );
      }

      const res = await fetch(`${imageServerUrl}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, n: 1, size: '512x512' }),
      });

      // Parse body regardless of status — some servers (e.g. LM Studio) return 200 with an error object
      const data = await res.json() as { data?: Array<{ url?: string; b64_json?: string }>; error?: { message?: string } };

      if (!res.ok || data.error) {
        throw new Error(
          data.error?.message ?? `Image generation failed: ${res.status} ${res.statusText}`,
        );
      }

      const item = data.data?.[0];
      const imageUrl =
        item?.url ??
        (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : undefined);
      if (!imageUrl) throw new Error('The holocron returned no image data.');

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], imageStatus: 'done', imageUrl };
        return updated;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image generation failed.';
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], imageStatus: 'error', content: msg };
        return updated;
      });
    }
  }, []);

  const restoreMessages = useCallback((restored: Message[]) => {
    skipNextResetRef.current = true;
    setMessages(restored);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, sendImageMessage, clearError, clearChat, restoreMessages, setPreferencesSection, lastStats };
}
