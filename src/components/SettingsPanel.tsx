import { useState } from 'react';
import SoundSettings from './SoundSettings';

interface SettingsPanelProps {
  serverUrl: string;
  onSave: (url: string) => void;
  imageServerUrl: string;
  onSaveImageUrl: (url: string) => void;
}

// LM Studio goes through the dev proxy (empty URL): calling it directly needs CORS enabled in
// LM Studio, otherwise the browser's preflight fails. Ollama allows localhost origins by default.
const SERVER_PRESETS = [
  { label: 'LM Studio', url: '', title: 'Dev proxy → http://localhost:1234' },
  { label: 'Ollama', url: 'http://localhost:11434', title: 'http://localhost:11434' },
];

function validateUrl(raw: string): string | null {
  if (!raw.trim()) return null; // empty = not configured, that's valid
  try { new URL(raw.trim()); return null; }
  catch { return 'Enter a valid URL, e.g. http://localhost:7860'; }
}

export default function SettingsPanel({ serverUrl, onSave, imageServerUrl, onSaveImageUrl }: SettingsPanelProps) {
  const [draft, setDraft] = useState(serverUrl);
  const [imgDraft, setImgDraft] = useState(imageServerUrl);
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [imgValidationError, setImgValidationError] = useState('');

  const handleSave = () => {
    if (validateUrl(draft)) {
      setValidationError('Enter a valid URL, e.g. http://localhost:1234');
      return;
    }
    setValidationError('');
    onSave(draft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveImageUrl = () => {
    const err = validateUrl(imgDraft);
    if (err) { setImgValidationError(err); return; }
    setImgValidationError('');
    onSaveImageUrl(imgDraft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-panel" role="region" aria-label="Server settings">
      <p className="settings-panel__label">LLM Server URL <span className="settings-panel__hint">(LM Studio / Ollama / OpenAI-compatible)</span></p>
      <div className="settings-panel__row">
        <input
          type="text"
          className={`settings-panel__input ${validationError ? 'settings-panel__input--error' : ''}`}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setValidationError(''); }}
          placeholder="Leave empty to use the dev proxy"
          aria-label="LLM server URL"
          aria-describedby={validationError ? 'settings-url-error' : undefined}
        />
        <button className="btn btn--gold" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      <div className="settings-panel__presets">
        {SERVER_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`btn btn--ghost ${draft.trim() === p.url ? 'btn--active' : ''}`}
            onClick={() => { setDraft(p.url); setValidationError(''); }}
            title={p.title}
          >
            {p.label}
          </button>
        ))}
      </div>
      {validationError && (
        <p id="settings-url-error" className="settings-panel__error" role="alert">{validationError}</p>
      )}

      <p className="settings-panel__label settings-panel__label--spaced">Image Server URL <span className="settings-panel__hint">(ComfyUI / AUTOMATIC1111 / OpenAI-compatible — not LM Studio)</span></p>
      <div className="settings-panel__row">
        <input
          type="text"
          className={`settings-panel__input ${imgValidationError ? 'settings-panel__input--error' : ''}`}
          value={imgDraft}
          onChange={(e) => { setImgDraft(e.target.value); setImgValidationError(''); }}
          placeholder="e.g. http://localhost:7860"
          aria-label="Image server URL"
          aria-describedby={imgValidationError ? 'settings-img-url-error' : undefined}
        />
        <button className="btn btn--gold" onClick={handleSaveImageUrl}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      {imgValidationError && (
        <p id="settings-img-url-error" className="settings-panel__error" role="alert">{imgValidationError}</p>
      )}

      <SoundSettings />
    </div>
  );
}
