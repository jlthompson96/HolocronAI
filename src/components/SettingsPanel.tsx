import { useState } from 'react';
import SoundSettings from './SoundSettings';

interface SettingsPanelProps {
  serverUrl: string;
  onSave: (url: string) => void;
  imageServerUrl: string;
  onSaveImageUrl: (url: string) => void;
}

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
    try {
      new URL(draft.trim());
    } catch {
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
      <p className="settings-panel__label">LM Studio Server URL</p>
      <div className="settings-panel__row">
        <input
          type="text"
          className={`settings-panel__input ${validationError ? 'settings-panel__input--error' : ''}`}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setValidationError(''); }}
          placeholder="Leave empty for dev proxy → localhost:1234"
          aria-label="LM Studio server URL"
          aria-describedby={validationError ? 'settings-url-error' : undefined}
        />
        <button className="btn btn--gold" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
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
