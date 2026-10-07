import { useState, useEffect, useRef } from 'react';
import type { Persona } from '../types/chat';
import { generatePersonaPrompt } from '../utils/generatePersonaPrompt';
import PersonaPresetChips from './PersonaPresetChips';
import { describePresetSelection } from '../constants/personaPresets';
import type { PresetSelection } from '../constants/personaPresets';
import AdvancedModelSection from './ModelSettingsFields';
import type { ModelSettings } from '../types/modelSettings';
import { cleanSettings } from '../hooks/usePersonaSettings';

const toModelSettings = (p: Persona | null): ModelSettings =>
  p ? cleanSettings({ model: p.model, temperature: p.temperature, maxTokens: p.maxTokens }) : {};

const PRESET_COLORS = [
  '#00d4ff', '#4ade80', '#60a5fa', '#f87171',
  '#fbbf24', '#a78bfa', '#fb923c', '#e879f9',
];

const EMPTY: Omit<Persona, 'id'> = {
  name: '',
  avatar: '◆',
  color: '#00d4ff',
  description: '',
  systemPrompt: '',
};

interface PersonaEditorProps {
  /** null = create mode; Persona = edit mode */
  persona: Persona | null;
  /** LM server used to generate system prompts */
  serverUrl: string;
  onSave: (persona: Persona) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function PersonaEditor({ persona, serverUrl, onSave, onDelete, onClose }: PersonaEditorProps) {
  const isEdit = persona !== null;

  const [form, setForm] = useState<Omit<Persona, 'id'>>(() =>
    persona ? { name: persona.name, avatar: persona.avatar, color: persona.color, description: persona.description, systemPrompt: persona.systemPrompt }
            : { ...EMPTY },
  );
  const [errors, setErrors] = useState<{ name?: string; systemPrompt?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  /** True once the first generated token has arrived */
  const [hasFirstToken, setHasFirstToken] = useState(false);
  const [presets, setPresets] = useState<PresetSelection>({});
  const [modelSettings, setModelSettings] = useState<ModelSettings>(() => toModelSettings(persona));
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight generation when the editor unmounts
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    setForm(
      persona
        ? { name: persona.name, avatar: persona.avatar, color: persona.color, description: persona.description, systemPrompt: persona.systemPrompt }
        : { ...EMPTY },
    );
    setErrors({});
    setConfirmDelete(false);
    abortRef.current?.abort();
    setIsGenerating(false);
    setGenerateError(null);
    setPresets({});
    setModelSettings(toModelSettings(persona));
  }, [persona]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    if (isGenerating) {
      abortRef.current?.abort();
      return;
    }
    if (!form.name.trim()) {
      setErrors((p) => ({ ...p, name: 'Enter a name to generate a prompt.' }));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setHasFirstToken(false);
    setGenerateError(null);
    setErrors((p) => ({ ...p, systemPrompt: undefined }));
    const previousPrompt = form.systemPrompt;

    try {
      const result = await generatePersonaPrompt(
        form.name.trim(),
        form.description.trim(),
        serverUrl,
        (text) => { setHasFirstToken(true); set('systemPrompt', text); },
        controller.signal,
        describePresetSelection(presets),
      );
      set('systemPrompt', result || previousPrompt);
      if (!result) setGenerateError('The holocron returned an empty prompt. Try again.');
    } catch (err) {
      if (controller.signal.aborted) return;
      set('systemPrompt', previousPrompt);
      setGenerateError(
        err instanceof Error && err.message.startsWith('The Imperial')
          ? err.message
          : 'Holonet disruption detected. Is your LM Server running?',
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsGenerating(false);
      }
    }
  };

  const handleSave = () => {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.systemPrompt.trim()) errs.systemPrompt = 'System prompt is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const id = isEdit ? persona!.id : crypto.randomUUID();
    const ms = cleanSettings(modelSettings);
    onSave({ id, ...form, name: form.name.trim(), description: form.description.trim(), systemPrompt: form.systemPrompt.trim(), model: ms.model, temperature: ms.temperature, maxTokens: ms.maxTokens });
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(persona!.id);
    onClose();
  };

  return (
    <>
      <div className="archive-backdrop" onClick={onClose} aria-hidden="true" />

      <aside className="persona-editor" aria-label={isEdit ? 'Edit persona' : 'New persona'}>
        <div className="archive-drawer__header">
          <div className="archive-drawer__title-group">
            <span className="archive-drawer__glyph" aria-hidden="true" style={{ color: form.color }}>
              {form.avatar || '◆'}
            </span>
            <h2 className="archive-drawer__title">
              {isEdit ? 'Edit Persona' : 'New Persona'}
            </h2>
          </div>
          <button className="btn btn--ghost archive-drawer__close" onClick={onClose} aria-label="Close editor">
            ✕
          </button>
        </div>

        <div className="persona-editor__body">

          {!isEdit && (
            <div className="persona-editor__intro">
              <p className="persona-editor__intro-title">How to create a persona</p>
              <ol className="persona-editor__intro-steps">
                <li>Give your character a <strong>name</strong>, and pick an avatar and color.</li>
                <li>Add a <strong>description</strong> saying who they are and how they act. The more detail, the better the prompt.</li>
                <li>Optionally pick <strong>presets</strong> (era, role, tone) to steer the generated prompt.</li>
                <li>Click <strong>✦ Generate</strong> to write the system prompt from the name, description and presets.</li>
                <li>Edit the prompt however you like, or click <strong>✦ Regenerate</strong> for a new version, then click <strong>✦ Create Persona</strong>.</li>
              </ol>
            </div>
          )}

          {/* Name */}
          <div className="persona-editor__field">
            <label className="persona-editor__label" htmlFor="pe-name">Name</label>
            <input
              id="pe-name"
              className={`persona-editor__input${errors.name ? ' persona-editor__input--error' : ''}`}
              value={form.name}
              onChange={(e) => { set('name', e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
              placeholder="e.g. C-3PO"
              maxLength={24}
            />
            {errors.name && <span className="persona-editor__error">{errors.name}</span>}
          </div>

          {/* Avatar + Color row */}
          <div className="persona-editor__row">
            <div className="persona-editor__field persona-editor__field--avatar">
              <label className="persona-editor__label" htmlFor="pe-avatar">Avatar</label>
              <input
                id="pe-avatar"
                className="persona-editor__input persona-editor__input--avatar"
                value={form.avatar}
                onChange={(e) => set('avatar', e.target.value.slice(-1) || '◆')}
                maxLength={2}
                placeholder="◆"
              />
            </div>
            <div className="persona-editor__field persona-editor__field--color">
              <label className="persona-editor__label">Color</label>
              <div className="persona-editor__swatches">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`persona-editor__swatch${form.color === c ? ' persona-editor__swatch--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => set('color', c)}
                    aria-label={`Color ${c}`}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  className="persona-editor__color-picker"
                  value={form.color}
                  onChange={(e) => set('color', e.target.value)}
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="persona-editor__field">
            <label className="persona-editor__label" htmlFor="pe-desc">Description <span className="persona-editor__optional">(optional)</span></label>
            <input
              id="pe-desc"
              className="persona-editor__input"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Who are they? Used to generate the prompt and shown on hover"
              maxLength={160}
            />
          </div>

          {/* Prompt presets (generation only, not saved) */}
          <PersonaPresetChips value={presets} onChange={setPresets} disabled={isGenerating} defaultOpen={!isEdit} />

          {/* System Prompt */}
          <div className="persona-editor__field persona-editor__field--grow">
            <div className="persona-editor__label-row">
              <label className="persona-editor__label" htmlFor="pe-prompt">System Prompt</label>
              <button
                type="button"
                className={`btn btn--ghost persona-editor__generate${isGenerating ? ' persona-editor__generate--active' : ''}`}
                onClick={handleGenerate}
                disabled={!isGenerating && !form.name.trim()}
                title={form.name.trim() ? 'Generate a system prompt from the name and description' : 'Enter a name first'}
              >
                {isGenerating ? '■ Stop' : form.systemPrompt.trim() ? '✦ Regenerate' : '✦ Generate'}
              </button>
            </div>
            <div className={`persona-editor__prompt-wrap${isGenerating ? ' persona-editor__prompt-wrap--generating' : ''}`}>
            <textarea
              id="pe-prompt"
              className={`persona-editor__textarea${errors.systemPrompt ? ' persona-editor__input--error' : ''}`}
              value={form.systemPrompt}
              onChange={(e) => { set('systemPrompt', e.target.value); setErrors((p) => ({ ...p, systemPrompt: undefined })); }}
              placeholder="Describe how this character should speak and behave… or click Generate"
              rows={7}
              readOnly={isGenerating}
              aria-busy={isGenerating}
            />
            {isGenerating && !hasFirstToken && (
              <div className="persona-editor__prompt-overlay" role="status">
                <span className="persona-editor__prompt-glyph" aria-hidden="true">✦</span>
                <span className="persona-editor__prompt-overlay-label">Consulting the holocron</span>
                <span className="loading-indicator__dots" aria-hidden="true">
                  <span className="loading-indicator__dot" />
                  <span className="loading-indicator__dot" />
                  <span className="loading-indicator__dot" />
                </span>
              </div>
            )}
            </div>
            {isGenerating && hasFirstToken && (
              <span className="persona-editor__prompt-status" role="status">
                <span className="persona-editor__prompt-status-glyph" aria-hidden="true">✦</span>
                Transcribing persona…
              </span>
            )}
            {generateError && <span className="persona-editor__error">{generateError}</span>}
            {errors.systemPrompt && <span className="persona-editor__error">{errors.systemPrompt}</span>}
          </div>

          {/* Advanced: per-persona model settings */}
          <AdvancedModelSection
            key={persona?.id ?? 'new'}
            value={modelSettings}
            onChange={setModelSettings}
            serverUrl={serverUrl}
          />

        </div>

        {/* Actions */}
        <div className="persona-editor__footer">
          {isEdit && (
            <button
              className={`btn btn--ghost persona-editor__delete${confirmDelete ? ' persona-editor__delete--confirm' : ''}`}
              onClick={handleDelete}
              title="Delete this persona"
            >
              {confirmDelete ? '⚠ Confirm Delete' : '✕ Delete'}
            </button>
          )}
          <div className="persona-editor__footer-right">
            <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn--gold" onClick={handleSave} disabled={isGenerating}>
              {isEdit ? '✓ Save Changes' : '✦ Create Persona'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
