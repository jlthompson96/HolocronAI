import { useState } from 'react';
import type { ModelSettings } from '../types/modelSettings';
import { DEFAULT_TEMPERATURE } from '../types/modelSettings';
import { useModels } from '../hooks/useModels';
import './ModelSettings.css';

interface ModelSettingsFieldsProps {
  value: ModelSettings;
  onChange: (next: ModelSettings) => void;
  serverUrl: string;
  /** Prefix for element ids so multiple instances don't collide */
  idPrefix?: string;
}

/** Controlled model / temperature / max-tokens fields. */
export function ModelSettingsFields({ value, onChange, serverUrl, idPrefix = 'ms' }: ModelSettingsFieldsProps) {
  const { models, loading, failed, refresh } = useModels(serverUrl);
  const set = <K extends keyof ModelSettings>(key: K, v: ModelSettings[K]) => onChange({ ...value, [key]: v });

  const currentModel = value.model ?? '';
  const options = currentModel && !models.includes(currentModel) ? [currentModel, ...models] : models;
  const temperature = value.temperature ?? DEFAULT_TEMPERATURE;

  return (
    <div className="model-settings">
      <div className="model-settings__field">
        <div className="model-settings__label-row">
          <label className="persona-editor__label" htmlFor={`${idPrefix}-model`}>Model</label>
          <button
            type="button"
            className="model-settings__link"
            onClick={refresh}
            title="Refresh model list from the server"
          >
            {loading ? 'Scanning…' : '↻ Refresh'}
          </button>
        </div>
        {failed && !loading ? (
          <>
            <input
              id={`${idPrefix}-model`}
              className="persona-editor__input"
              value={currentModel}
              onChange={(e) => set('model', e.target.value.trim() || undefined)}
              placeholder="Server default (type a model id)"
            />
            <span className="model-settings__hint">Couldn't fetch models from the server — enter a model id manually.</span>
          </>
        ) : (
          <select
            id={`${idPrefix}-model`}
            className="persona-editor__input model-settings__select"
            value={currentModel}
            onChange={(e) => set('model', e.target.value || undefined)}
            disabled={loading && options.length === 0}
          >
            <option value="">Server default</option>
            {options.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      <div className="model-settings__field">
        <div className="model-settings__label-row">
          <label className="persona-editor__label" htmlFor={`${idPrefix}-temp`}>
            Temperature <span className="model-settings__value">{temperature.toFixed(2)}</span>
          </label>
          {value.temperature !== undefined && (
            <button type="button" className="model-settings__link" onClick={() => set('temperature', undefined)}>
              Reset
            </button>
          )}
        </div>
        <input
          id={`${idPrefix}-temp`}
          type="range"
          className="model-settings__range"
          min={0}
          max={2}
          step={0.05}
          value={temperature}
          onChange={(e) => set('temperature', Number(e.target.value))}
        />
        <div className="model-settings__range-labels" aria-hidden="true">
          <span>Precise</span><span>Creative</span>
        </div>
      </div>

      <div className="model-settings__field">
        <label className="persona-editor__label" htmlFor={`${idPrefix}-max`}>
          Max Tokens <span className="persona-editor__optional">(blank = unlimited)</span>
        </label>
        <input
          id={`${idPrefix}-max`}
          type="number"
          min={1}
          step={1}
          className="persona-editor__input"
          value={value.maxTokens ?? ''}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            set('maxTokens', Number.isFinite(n) && n > 0 ? n : undefined);
          }}
          placeholder="Unlimited"
        />
      </div>
    </div>
  );
}

interface AdvancedModelSectionProps {
  value: ModelSettings;
  onChange: (next: ModelSettings) => void;
  serverUrl: string;
}

/** Collapsible "Advanced" section for the PersonaEditor. */
export default function AdvancedModelSection({ value, onChange, serverUrl }: AdvancedModelSectionProps) {
  const hasValues = value.model !== undefined || value.temperature !== undefined || value.maxTokens !== undefined;
  const [open, setOpen] = useState(hasValues);

  return (
    <div className={`model-settings__advanced${open ? ' model-settings__advanced--open' : ''}`}>
      <button
        type="button"
        className="model-settings__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="model-settings__chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
        Advanced — Model Settings
        {!open && hasValues && <span className="model-settings__badge">custom</span>}
      </button>
      {open && <ModelSettingsFields value={value} onChange={onChange} serverUrl={serverUrl} idPrefix="pe-adv" />}
    </div>
  );
}
