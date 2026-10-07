import { useState } from 'react';
import type { Persona } from '../types/chat';

const STORAGE_KEY = 'holocron-custom-personas';

function load(): Persona[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persona[]) : [];
  } catch {
    return [];
  }
}

function persist(personas: Persona[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
  } catch {
    // storage quota — silently ignore
  }
}

export function useCustomPersonas() {
  const [customPersonas, setCustomPersonas] = useState<Persona[]>(load);

  const savePersona = (persona: Persona) => {
    setCustomPersonas((prev) => {
      const exists = prev.some((p) => p.id === persona.id);
      const next = exists
        ? prev.map((p) => (p.id === persona.id ? persona : p))
        : [...prev, persona];
      persist(next);
      return next;
    });
  };

  const deletePersona = (id: string) => {
    setCustomPersonas((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persist(next);
      return next;
    });
  };

  return { customPersonas, savePersona, deletePersona };
}
