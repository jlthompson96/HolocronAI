import { useState, useCallback } from 'react';

const STORAGE_KEY = 'holocron-reactions';

interface ReactionLogEntry {
  key: string;
  reactionId: string;
  contentPreview: string;
  savedAt: string;
}

/** Deterministic key from message content (FNV-1a, 32-bit). */
export function msgKey(content: string): string {
  let h = 2166136261;
  for (let i = 0; i < Math.min(content.length, 256); i++) {
    h ^= content.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(36);
}

function loadReactions(): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const log = JSON.parse(raw) as ReactionLogEntry[];
    return new Map(log.map((e) => [e.key, e.reactionId]));
  } catch {
    return new Map();
  }
}

interface UseMessageReactionsReturn {
  reactions: Map<string, string>;
  react: (key: string, reactionId: string, contentPreview: string) => void;
}

export function useMessageReactions(): UseMessageReactionsReturn {
  const [reactions, setReactions] = useState<Map<string, string>>(loadReactions);

  const react = useCallback((key: string, reactionId: string, contentPreview: string) => {
    setReactions((prev) => {
      const updated = new Map(prev);
      const isToggleOff = updated.get(key) === reactionId;
      if (isToggleOff) {
        updated.delete(key);
      } else {
        updated.set(key, reactionId);
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const log: ReactionLogEntry[] = raw ? (JSON.parse(raw) as ReactionLogEntry[]) : [];
        const filtered = log.filter((e) => e.key !== key);
        if (!isToggleOff) {
          filtered.push({
            key,
            reactionId,
            contentPreview: contentPreview.slice(0, 80),
            savedAt: new Date().toISOString(),
          });
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch {
        // Ignore storage quota errors
      }

      return updated;
    });
  }, []);

  return { reactions, react };
}
