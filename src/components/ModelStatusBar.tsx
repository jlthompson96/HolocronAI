import { useEffect, useRef, useState } from 'react';
import type { GenerationStats as Stats, ModelSettings } from '../types/modelSettings';
import { ModelSettingsFields } from './ModelSettingsFields';
import GenerationStats from './GenerationStats';
import './ModelSettings.css';

interface ModelStatusBarProps {
  personaName: string;
  settings: ModelSettings;
  onSave: (settings: ModelSettings) => void;
  serverUrl: string;
  stats: Stats | null;
}

/**
 * Thin bar above the chat input: last-response stats on the left, and a
 * "⚙ model" button on the right that opens a popover to edit the active
 * persona's model settings.
 */
export default function ModelStatusBar({ personaName, settings, onSave, serverUrl, stats }: ModelStatusBarProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ModelSettings>(settings);
  const rootRef = useRef<HTMLDivElement>(null);

  const openPopover = () => {
    setDraft(settings);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = settings.model ?? 'default model';
  const isCustom = settings.model !== undefined || settings.temperature !== undefined || settings.maxTokens !== undefined;

  return (
    <div className="model-bar" ref={rootRef}>
      <GenerationStats stats={stats} />
      <button
        type="button"
        className={`model-bar__btn${open ? ' model-bar__btn--active' : ''}${isCustom ? ' model-bar__btn--custom' : ''}`}
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-expanded={open}
        title={`Model settings for ${personaName}`}
      >
        ⚙ {label}
      </button>

      {open && (
        <div className="model-bar__popover" role="dialog" aria-label={`Model settings for ${personaName}`}>
          <p className="model-bar__title">Model settings · {personaName}</p>
          <ModelSettingsFields value={draft} onChange={setDraft} serverUrl={serverUrl} idPrefix="mb" />
          <div className="model-bar__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => { onSave({}); setOpen(false); }}
              title="Clear all overrides and use server defaults"
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn--gold"
              onClick={() => { onSave(draft); setOpen(false); }}
            >
              ✓ Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
