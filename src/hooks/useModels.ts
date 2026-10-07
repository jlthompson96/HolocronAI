import { useCallback, useEffect, useState } from 'react';

interface UseModelsReturn {
  models: string[];
  loading: boolean;
  /** True when the model list could not be fetched — UI should fall back to free text */
  failed: boolean;
  refresh: () => void;
}

interface Result {
  key: string;
  models: string[];
  failed: boolean;
}

/** Fetches the list of models available on an OpenAI-compatible server (`/v1/models`). */
export function useModels(serverUrl: string): UseModelsReturn {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result>({ key: '', models: [], failed: false });
  const requestKey = `${serverUrl}#${nonce}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${serverUrl}/v1/models`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<{ data?: Array<{ id?: string }> }>;
      })
      .then((json) => {
        const ids = (json.data ?? []).map((m) => m.id).filter((id): id is string => !!id);
        setResult({ key: requestKey, models: ids, failed: ids.length === 0 });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult({ key: requestKey, models: [], failed: true });
      });
    return () => controller.abort();
  }, [serverUrl, requestKey]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const loading = result.key !== requestKey;

  return { models: result.models, loading, failed: !loading && result.failed, refresh };
}
