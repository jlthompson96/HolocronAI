import { useState, useEffect, useRef, type CSSProperties, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Persona } from '../types/chat';
import type { ModelSettings } from '../types/modelSettings';
import { useDebate, type DebateEntry } from '../hooks/useDebate';
import './Debate.css';

const MIN_ROUNDS = 1;
const MAX_ROUNDS = 5;

interface DebateArenaProps {
  personas: Persona[];
  serverUrl: string;
  /** Effective per-persona model settings (model, temperature, max tokens) */
  getSettings?: (persona: Persona) => ModelSettings;
  onClose: () => void;
}

interface DebateMessageProps {
  entry: DebateEntry;
  persona: Persona | null;
}

function DebateMessage({ entry, persona }: DebateMessageProps) {
  if (entry.speaker === 'moderator' || !persona) {
    return (
      <div className="debate-message debate-message--moderator">
        <div className="debate-message__moderator">
          <span className="debate-message__moderator-label">Moderator</span>
          <p className="debate-message__moderator-text">{entry.content}</p>
        </div>
      </div>
    );
  }

  const side = entry.speaker === 'a' ? 'left' : 'right';
  return (
    <div
      className={`chat-message debate-message debate-message--${side}`}
      style={{ '--persona-color': persona.color } as CSSProperties}
    >
      <div className="chat-message__label debate-message__label">
        <span className="debate-message__avatar" aria-hidden="true">{persona.avatar}</span>
        {persona.name}
        {entry.round !== undefined && <span className="debate-message__round">Round {entry.round}</span>}
      </div>
      <div className="chat-message__bubble-wrapper">
        <div className="chat-message__bubble debate-message__bubble">
          {entry.content ? (
            <div className="chat-message__markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
            </div>
          ) : (
            <span className="debate-message__thinking">Gathering thoughts…</span>
          )}
          {entry.streaming && entry.content && <span className="debate-message__cursor" aria-hidden="true">▍</span>}
          {entry.interrupted && <span className="debate-message__interrupted">— cut off by the moderator</span>}
        </div>
      </div>
    </div>
  );
}

export default function DebateArena({ personas, serverUrl, getSettings, onClose }: DebateArenaProps) {
  const { entries, status, config, turnsDone, totalTurns, error, clearError, start, stop, resume, addModeratorMessage, reset } =
    useDebate(serverUrl, getSettings);

  const [aId, setAId] = useState(personas[0]?.id ?? '');
  const [bId, setBId] = useState(personas[1]?.id ?? personas[0]?.id ?? '');
  const [topic, setTopic] = useState('');
  const [rounds, setRounds] = useState(3);
  const [moderatorText, setModeratorText] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  const personaA = personas.find((p) => p.id === aId) ?? null;
  const personaB = personas.find((p) => p.id === bId) ?? null;
  const canStart = !!personaA && !!personaB && topic.trim().length > 0 && status !== 'running';
  const isRunning = status === 'running';
  const inSetup = status === 'idle';

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    if (!canStart || !personaA || !personaB) return;
    start({ a: personaA, b: personaB, topic: topic.trim(), rounds });
  };

  const handleModerator = (e: FormEvent) => {
    e.preventDefault();
    if (!moderatorText.trim()) return;
    addModeratorMessage(moderatorText);
    setModeratorText('');
  };

  const handleSwap = () => {
    setAId(bId);
    setBId(aId);
  };

  const currentRound = Math.min(Math.floor(turnsDone / 2) + 1, Math.max(1, totalTurns / 2));
  const nextSpeaker = config ? (turnsDone % 2 === 0 ? config.a : config.b) : null;

  const statusText = (() => {
    if (!config) return '';
    if (status === 'running') return `Round ${currentRound} of ${totalTurns / 2} · ${nextSpeaker?.name} speaking`;
    if (status === 'stopped') return `Paused · ${nextSpeaker?.name} is next`;
    if (status === 'done') return `Debate concluded after ${totalTurns / 2} round${totalTurns / 2 !== 1 ? 's' : ''}`;
    return '';
  })();

  const getPersona = (entry: DebateEntry): Persona | null => {
    if (!config || entry.speaker === 'moderator') return null;
    return entry.speaker === 'a' ? config.a : config.b;
  };

  const renderPersonaSelect = (id: string, label: string, value: string, onChange: (v: string) => void) => {
    const selected = personas.find((p) => p.id === value);
    return (
      <div className="debate-setup__combatant" style={{ '--persona-color': selected?.color ?? 'var(--gold)' } as CSSProperties}>
        <label className="debate-setup__label" htmlFor={id}>{label}</label>
        <div className="debate-setup__select-row">
          <span className="debate-setup__avatar" aria-hidden="true">{selected?.avatar ?? '?'}</span>
          <select id={id} className="debate-setup__input debate-setup__select" value={value} onChange={(e) => onChange(e.target.value)}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="archive-backdrop debate-backdrop" onClick={onClose} aria-hidden="true" />

      <section className="debate-arena" role="dialog" aria-modal="true" aria-label="Debate Arena">
        <div className="archive-drawer__header">
          <div className="archive-drawer__title-group">
            <span className="archive-drawer__glyph" aria-hidden="true">⚔</span>
            <h2 className="archive-drawer__title">Debate Arena</h2>
          </div>
          <button className="btn btn--ghost archive-drawer__close" onClick={onClose} aria-label="Close debate arena">
            ✕
          </button>
        </div>

        {inSetup ? (
          <form className="debate-setup" onSubmit={handleStart}>
            <div className="debate-setup__combatants">
              {renderPersonaSelect('debate-a', 'Opening speaker', aId, setAId)}
              <button
                type="button"
                className="debate-setup__vs"
                onClick={handleSwap}
                title="Swap speakers"
                aria-label="Swap speakers"
              >
                VS
              </button>
              {renderPersonaSelect('debate-b', 'Challenger', bId, setBId)}
            </div>

            <div className="debate-setup__field">
              <label className="debate-setup__label" htmlFor="debate-topic">Topic</label>
              <input
                id="debate-topic"
                className="debate-setup__input"
                type="text"
                value={topic}
                maxLength={300}
                placeholder="e.g. Is the Jedi Order's ban on attachment wise?"
                onChange={(e) => setTopic(e.target.value)}
                autoFocus
              />
            </div>

            <div className="debate-setup__field">
              <label className="debate-setup__label" htmlFor="debate-rounds">
                Rounds <span className="debate-setup__rounds-value">{rounds}</span>
              </label>
              <input
                id="debate-rounds"
                className="debate-setup__range"
                type="range"
                min={MIN_ROUNDS}
                max={MAX_ROUNDS}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
              />
              <p className="debate-setup__hint">
                Each round, both combatants speak once. You can stop the debate or interject as moderator at any time.
              </p>
            </div>

            {aId === bId && (
              <p className="debate-setup__hint debate-setup__hint--warn">A persona debating itself — the Force works in mysterious ways.</p>
            )}

            <button type="submit" className="btn btn--gold debate-setup__start" disabled={!canStart}>
              ⚔ Begin Debate
            </button>
          </form>
        ) : (
          <>
            {config && (
              <div className="debate-banner">
                <span className="debate-banner__side" style={{ color: config.a.color }}>
                  <span aria-hidden="true">{config.a.avatar}</span> {config.a.name}
                </span>
                <span className="debate-banner__vs">vs</span>
                <span className="debate-banner__side" style={{ color: config.b.color }}>
                  {config.b.name} <span aria-hidden="true">{config.b.avatar}</span>
                </span>
                <p className="debate-banner__topic">{config.topic}</p>
              </div>
            )}

            <div className="debate-transcript" ref={transcriptRef} aria-live="polite">
              {entries.map((entry) => (
                <DebateMessage key={entry.id} entry={entry} persona={getPersona(entry)} />
              ))}
            </div>

            {error && (
              <div className="debate-error" role="alert">
                <span>{error}</span>
                <button className="btn btn--ghost" onClick={clearError} aria-label="Dismiss error">✕</button>
              </div>
            )}

            <div className="debate-controls">
              <div className="debate-controls__status">
                {isRunning && <span className="debate-controls__pulse" aria-hidden="true" />}
                {statusText}
              </div>
              <div className="debate-controls__buttons">
                {isRunning && (
                  <button className="btn btn--ghost debate-controls__stop" onClick={stop}>
                    ■ Stop
                  </button>
                )}
                {status === 'stopped' && (
                  <button className="btn btn--gold" onClick={() => resume()}>
                    ▶ Resume
                  </button>
                )}
                {status === 'done' && (
                  <button className="btn btn--ghost" onClick={() => resume(1)}>
                    + 1 Round
                  </button>
                )}
                {!isRunning && (
                  <button className="btn btn--ghost" onClick={reset}>
                    New Debate
                  </button>
                )}
              </div>
            </div>

            <form className="debate-moderator" onSubmit={handleModerator}>
              <input
                className="debate-setup__input debate-moderator__input"
                type="text"
                value={moderatorText}
                maxLength={1000}
                placeholder={
                  isRunning
                    ? 'Interject as moderator — the next speaker will hear it…'
                    : 'Add a moderator note, then resume…'
                }
                onChange={(e) => setModeratorText(e.target.value)}
                aria-label="Moderator message"
              />
              <button type="submit" className="btn btn--ghost" disabled={!moderatorText.trim()}>
                Interject
              </button>
            </form>
          </>
        )}
      </section>
    </>
  );
}
