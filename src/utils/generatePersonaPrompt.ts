const META_PROMPT =
  "You write system prompts for characters in a Star Wars themed AI chat app. " +
  "Given a character name and description, write a single system prompt in the second person ('You are ...') " +
  "that tells the AI who it is, how it speaks (tone, vocabulary, verbal tics), its personality and outlook, " +
  "and what lore it should reference. The character must still answer the user's questions accurately and helpfully " +
  "while staying in character. Keep it to one paragraph of 4-7 sentences. " +
  "Output only the system prompt text — no title, no quotes, no preamble.";

/**
 * Streams a generated system prompt for a persona from the LM server.
 * `onToken` receives the accumulated text so far.
 */
export async function generatePersonaPrompt(
  name: string,
  description: string,
  serverUrl: string,
  onToken: (textSoFar: string) => void,
  signal?: AbortSignal,
  /** Optional extra traits (e.g. preset lines like "Era: Clone Wars") to include in the request */
  traits?: string[],
): Promise<string> {
  let userContent = description
    ? `Character name: ${name}\nDescription: ${description}`
    : `Character name: ${name}`;
  if (traits && traits.length) {
    userContent += `\nTraits (work these into the prompt):\n${traits.map((t) => `- ${t}`).join('\n')}`;
  }

  const response = await fetch(`${serverUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'local-model',
      messages: [
        { role: 'system', content: META_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.8,
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

  return text.trim();
}
