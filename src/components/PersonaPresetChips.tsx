import { useState } from 'react';
import { PERSONA_PRESET_GROUPS } from '../constants/personaPresets';
import type { PresetGroupId, PresetSelection } from '../constants/personaPresets';
import './PersonaPresetChips.css';

interface PersonaPresetChipsProps {
  value: PresetSelection;
  onChange: (next: PresetSelection) => void;
  disabled?: boolean;
  /** Whether the chip panel starts expanded */
  defaultOpen?: boolean;
}

/** Single-select (deselectable) chip groups used to steer persona prompt generation. */
export default function PersonaPresetChips({ value, onChange, disabled, defaultOpen = true }: PersonaPresetChipsProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = (group: PresetGroupId, id: string) => {
    const next = { ...value };
    if (next[group] === id) delete next[group];
    else next[group] = id;
    onChange(next);
  };

  const selectedLabels = PERSONA_PRESET_GROUPS
    .map((g) => g.options.find((o) => o.id === value[g.id])?.label)
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="preset-chips">
      <div className="persona-editor__label-row">
        <button
          type="button"
          className="preset-chips__toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="persona-editor__label">
            {open ? '▾' : '▸'} Presets <span className="persona-editor__optional">(optional)</span>
          </span>
        </button>
        {selectedLabels && (
          <span className="preset-chips__summary" title={selectedLabels}>{selectedLabels}</span>
        )}
      </div>

      {open && PERSONA_PRESET_GROUPS.map((group) => (
        <div key={group.id} className="preset-chips__group" role="radiogroup" aria-label={group.label}>
          <span className="preset-chips__group-label">{group.label}</span>
          <div className="preset-chips__options">
            {group.options.map((opt) => {
              const active = value[group.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`preset-chips__chip${active ? ' preset-chips__chip--active' : ''}`}
                  onClick={() => toggle(group.id, opt.id)}
                  disabled={disabled}
                  title={`${opt.hint} (click again to clear)`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
