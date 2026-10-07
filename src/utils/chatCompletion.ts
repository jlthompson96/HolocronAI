import { DEFAULT_MODEL } from '../types/modelSettings';

/** Real model ids for servers that rejected the DEFAULT_MODEL placeholder, keyed by server URL. */
const fallbackModels = new Map<string, string>();

async function firstListedModel(serverUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${serverUrl}/v1/models`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    const ids = (json.data ?? []).map((m) => m.id).filter((id): id is string => !!id);
    return ids.find((id) => !/embed/i.test(id)) ?? ids[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * POSTs to `/v1/chat/completions`. With no `model`, sends the DEFAULT_MODEL placeholder,
 * which LM Studio maps to its loaded model. Servers that reject unknown names with a 404
 * (Ollama) get one retry with the first model from `/v1/models`, remembered per server.
 * Returns the response and the model name that was sent.
 */
export async function postChatCompletion(
  serverUrl: string,
  model: string | undefined,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ response: Response; model: string }> {
  const send = (m: string) =>
    fetch(`${serverUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, model: m }),
      signal,
    });

  const sentModel = model || fallbackModels.get(serverUrl) || DEFAULT_MODEL;
  const response = await send(sentModel);
  if (response.status !== 404 || sentModel !== DEFAULT_MODEL) return { response, model: sentModel };

  const fallback = await firstListedModel(serverUrl);
  if (!fallback) return { response, model: sentModel };
  fallbackModels.set(serverUrl, fallback);
  return { response: await send(fallback), model: fallback };
}
