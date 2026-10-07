import { useState, useCallback } from 'react';
import { buildStyleNote, MAX_NOTES_PER_PERSONA, type StyleNote } from '../utils/preferenceNotes';

const NOTES_KEY = 'holocron-persona-preferences';
const ENABLED_KEY = 'holocron-persona-preferences-enabled';

type NotesByPersona = Record<string, StyleNote[]>;

function loadNotes(): NotesByPersona {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as NotesByPersona) : {};
  } catch {
    return {};
  }
}

function loadEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== 'false';
  } catch {
    return true;
  }
}

function persist(notes: NotesByPersona) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage quota errors
  }
}

interface UsePersonaPreferencesReturn {
  notesByPersona: NotesByPersona;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** Record (or replace) the note for a reacted message; `null` reactionId removes it. */
  recordReaction: (personaId: string, key: string, reactionId: string | null, content: string) => void;
  removeNote: (personaId: string, key: string) => void;
  clearPersona: (personaId: string) => void;
}

export function usePersonaPreferences(): UsePersonaPreferencesReturn {
  const [notesByPersona, setNotesByPersona] = useState<NotesByPersona>(loadNotes);
  const [enabled, setEnabledState] = useState<boolean>(loadEnabled);

  const update = useCallback((personaId: string, fn: (notes: StyleNote[]) => StyleNote[]) => {
    setNotesByPersona((prev) => {
      const nextList = fn(prev[personaId] ?? []);
      const next = { ...prev };
      if (nextList.length > 0) next[personaId] = nextList;
      else delete next[personaId];
      persist(next);
      return next;
    });
  }, []);

  const recordReaction = useCallback(
    (personaId: string, key: string, reactionId: string | null, content: string) => {
      update(personaId, (notes) => {
        const others = notes.filter((n) => n.key !== key);
        if (!reactionId) return others;
        const note = buildStyleNote(key, reactionId, content);
        // Dedupe identical summaries (e.g. the same reply reacted to in two sessions)
        const deduped = others.filter((n) => n.summary !== note.summary);
        return [...deduped, note].slice(-MAX_NOTES_PER_PERSONA);
      });
    },
    [update],
  );

  const removeNote = useCallback(
    (personaId: string, key: string) => update(personaId, (notes) => notes.filter((n) => n.key !== key)),
    [update],
  );

  const clearPersona = useCallback((personaId: string) => update(personaId, () => []), [update]);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    try {
      localStorage.setItem(ENABLED_KEY, String(value));
    } catch {
      // Ignore storage errors
    }
  }, []);

  return { notesByPersona, enabled, setEnabled, recordReaction, removeNote, clearPersona };
}
