import { useState, useCallback } from 'react';
import type { Message, ArchivedSession } from '../types/chat';

const STORAGE_KEY = 'holocron-archive';

function loadSessions(): ArchivedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ArchivedSession[]) : [];
  } catch {
    return [];
  }
}

interface UseHolocronArchiveReturn {
  sessions: ArchivedSession[];
  saveSession: (messages: Message[], personaId: string) => void;
  deleteSession: (id: string) => void;
}

export function useHolocronArchive(): UseHolocronArchiveReturn {
  const [sessions, setSessions] = useState<ArchivedSession[]>(loadSessions);

  const persist = useCallback((updated: ArchivedSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const saveSession = useCallback(
    (messages: Message[], personaId: string) => {
      const userMsg = messages.find((m) => m.role === 'user');
      const raw = userMsg?.content ?? '';
      const title =
        raw.length > 0
          ? raw.slice(0, 44) + (raw.length > 44 ? '…' : '')
          : 'Empty Transmission';
      const session: ArchivedSession = {
        id: crypto.randomUUID(),
        title,
        personaId,
        savedAt: new Date().toISOString(),
        messages,
      };
      persist([session, ...sessions]);
    },
    [sessions, persist],
  );

  const deleteSession = useCallback(
    (id: string) => {
      persist(sessions.filter((s) => s.id !== id));
    },
    [sessions, persist],
  );

  return { sessions, saveSession, deleteSession };
}
