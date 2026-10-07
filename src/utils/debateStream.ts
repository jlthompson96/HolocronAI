import { DEFAULT_MODEL, type ModelSettings } from '../types/modelSettings';

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Streams a chat completion from the LM server (OpenAI-compatible SSE).
 * `onToken` receives the accumulated text so far. Returns the full text.
 */
export async function streamChatCompletion(
  messages: ChatCompletionMessage[],
  serverUrl: string,
  onToken: (textSoFar: string) => void,
  signal?: AbortSignal,
  settings: ModelSettings = {},
): Promise<string> {
  const response = await fetch(`${serverUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: settings.model || DEFAULT_MODEL,
      messages,
      temperature: settings.temperature ?? 0.8,
      ...(settings.maxTokens ? { max_tokens: settings.maxTokens } : {}),
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`The Imperial network returned an error: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('The Imperial network returned no data stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

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
          text += delta;
          onToken(text);
        }
      } catch {
        // Ignore malformed SSE chunks
      }
    }
  }

  return text;
}
