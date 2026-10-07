import { useCallback, useState } from 'react';
import type { Persona } from '../types/chat';
import type { ModelSettings } from '../types/modelSettings';

const STORAGE_KEY = 'holocron-persona-model-overrides';

type Overrides = Record<string, ModelSettings>;

function load(): Overrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

function persist(overrides: Overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // storage quota — silently ignore
  }
}

/** Strip undefined/empty fields so stored objects stay minimal. */
export function cleanSettings(s: ModelSettings): ModelSettings {
  const out: ModelSettings = {};
  if (s.model) out.model = s.model;
  if (typeof s.temperature === 'number' && !Number.isNaN(s.temperature)) out.temperature = s.temperature;
  if (typeof s.maxTokens === 'number' && s.maxTokens > 0) out.maxTokens = Math.floor(s.maxTokens);
  return out;
}

/**
 * Per-persona model setting overrides, stored in localStorage keyed by persona id.
 * Works for any persona (built-in included). Overrides take precedence over
 * settings stored on the Persona itself.
 */
export function usePersonaSettings() {
  const [overrides, setOverrides] = useState<Overrides>(load);

  const setOverride = useCallback((personaId: string, settings: ModelSettings) => {
    setOverrides((prev) => {
      const cleaned = cleanSettings(settings);
      const next = { ...prev };
      if (Object.keys(cleaned).length) next[personaId] = cleaned;
      else delete next[personaId];
      persist(next);
      return next;
    });
  }, []);

  const getEffective = useCallback(
    (persona: Persona): ModelSettings => {
      const fromPersona = cleanSettings({
        model: persona.model,
        temperature: persona.temperature,
        maxTokens: persona.maxTokens,
      });
      return { ...fromPersona, ...(overrides[persona.id] ?? {}) };
    },
    [overrides],
  );

  return { overrides, setOverride, getEffective };
}
