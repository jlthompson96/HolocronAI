import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MISSIONS } from '../constants/missions';
import { useMission } from '../hooks/useMission';
import { parseGmReply } from '../utils/missionState';
import './Mission.css';

interface MissionConsoleProps {
  serverUrl: string;
  imageServerUrl: string;
  onClose: () => void;
}

export default function MissionConsole({ serverUrl, imageServerUrl, onClose }: MissionConsoleProps) {
  const {
    mission,
    messages,
    stats,
    turn,
    sceneImage,
    isLoading,
    isStreaming,
    error,
    clearError,
    clearSceneImage,
    startMission,
    abandonMission,
    takeAction,
    visualizeScene,
  } = useMission(serverUrl, imageServerUrl);
  const [input, setInput] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const busy = isLoading || isStreaming;
  const ended = stats?.status === 'victory' || stats?.status === 'defeat';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !input.trim()) return;
    takeAction(input);
    setInput('');
  };

  const handleAbandon = () => {
    if (ended || window.confirm('Abandon this mission? Progress will be lost.')) abandonMission();
  };

  // Choices from the most recent GM reply
  const lastIndex = messages.length - 1;
  const lastParsed =
    stats && lastIndex >= 0 && messages[lastIndex].role === 'assistant'
      ? parseGmReply(messages[lastIndex].content, stats)
      : null;
  const choices = !busy && !ended ? lastParsed?.choices ?? [] : [];

  const healthClass =
    stats && stats.health <= 25 ? 'mission-bar__fill--low' : stats && stats.health <= 60 ? 'mission-bar__fill--mid' : '';

  return (
    <>
      <div className="mission-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="mission-console" role="dialog" aria-modal="true" aria-label="Mission console">
        <header className="mission-console__header">
          <div className="mission-console__title-group">
            <span className="mission-console__glyph" aria-hidden="true">{mission?.icon ?? '◉'}</span>
            <div>
              <h2 className="mission-console__title">{mission ? mission.title : 'Mission Briefing'}</h2>
              <p className="mission-console__subtitle">
                {mission ? mission.location : 'Select an operation, pilot.'}
              </p>
            </div>
          </div>
          <div className="mission-console__actions">
            {mission && (
              <>
                <button
                  className="btn btn--ghost"
                  onClick={visualizeScene}
                  disabled={sceneImage?.status === 'loading'}
                  title="Generate an image of the current scene"
                >
                  🎨 Visualize scene
                </button>
                <button className="btn btn--ghost" onClick={handleAbandon} title="Abandon mission and pick another">
                  ⊗ {ended ? 'New Mission' : 'Abandon'}
                </button>
              </>
            )}
            <button className="btn btn--ghost" onClick={onClose} aria-label="Close missions">
              ✕
            </button>
          </div>
        </header>

        {!mission || !stats ? (
          <div className="mission-picker" role="list">
            {MISSIONS.map((m) => (
              <article key={m.id} className="mission-card" role="listitem">
                <div className="mission-card__head">
                  <span className="mission-card__icon" aria-hidden="true">{m.icon}</span>
                  <div>
                    <h3 className="mission-card__title">{m.title}</h3>
                    <p className="mission-card__location">{m.location}</p>
                  </div>
                </div>
                <p className="mission-card__blurb">{m.blurb}</p>
                <div className="mission-card__stats">
                  <span>♥ {m.start.health}</span>
                  <span>⌬ {m.start.credits} cr</span>
                  <span>▣ {m.start.inventory.length} items</span>
                </div>
                <button className="btn btn--gold mission-card__start" onClick={() => startMission(m)}>
                  ▶ Launch Mission
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="mission-body">
            <div className="mission-main">
              <div className="mission-log" ref={logRef}>
                {messages.map((msg, i) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={i} className="mission-entry mission-entry--player">
                        <span className="mission-entry__label">You</span>
                        <p>{msg.content}</p>
                      </div>
                    );
                  }
                  const parsed = parseGmReply(msg.content, stats);
                  const isLive = isStreaming && i === lastIndex;
                  return (
                    <div key={i} className="mission-entry mission-entry--gm">
                      <span className="mission-entry__label">Game Master</span>
                      <div className="mission-entry__text chat-message__markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.narrative}</ReactMarkdown>
                        {isLive && <span className="blink-cursor" aria-hidden="true" />}
                      </div>
                      {!isLive && i !== lastIndex && parsed.choices.length > 0 && (
                        <ol className="mission-entry__past-choices">
                          {parsed.choices.map((c, j) => <li key={j}>{c}</li>)}
                        </ol>
                      )}
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="mission-entry mission-entry--gm mission-entry--pending">
                    <span className="mission-entry__label">Game Master</span>
                    <p>The holonet crackles as the story unfolds…</p>
                  </div>
                )}
                {ended && (
                  <div className={`mission-outcome mission-outcome--${stats.status}`} role="status">
                    <span className="mission-outcome__glyph" aria-hidden="true">
                      {stats.status === 'victory' ? '✦' : '⊗'}
                    </span>
                    <h3>{stats.status === 'victory' ? 'Mission Accomplished' : 'Mission Failed'}</h3>
                    <p>
                      {stats.status === 'victory'
                        ? `The Force was with you. Completed in ${turn} turn${turn !== 1 ? 's' : ''}.`
                        : `Your story ends here after ${turn} turn${turn !== 1 ? 's' : ''}.`}
                    </p>
                    <div className="mission-outcome__actions">
                      <button className="btn btn--gold" onClick={() => startMission(mission)}>↻ Retry</button>
                      <button className="btn btn--ghost" onClick={abandonMission}>◉ Choose Another</button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mission-error" role="alert">
                  <span>⚠ {error}</span>
                  <button className="btn btn--ghost" onClick={clearError} aria-label="Dismiss error">✕</button>
                </div>
              )}

              {choices.length > 0 && (
                <div className="mission-choices">
                  {choices.map((c, i) => (
                    <button key={i} className="mission-choice" onClick={() => takeAction(c)}>
                      <span className="mission-choice__num">{i + 1}</span>
                      <span>{c}</span>
                    </button>
                  ))}
                </div>
              )}

              {!ended && (
                <form className="mission-input" onSubmit={handleSubmit}>
                  <input
                    className="mission-input__field"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={busy ? 'The Game Master is speaking…' : 'Pick a choice or describe your own action…'}
                    disabled={busy}
                    maxLength={500}
                    aria-label="Your action"
                  />
                  <button className="btn btn--gold" type="submit" disabled={busy || !input.trim()}>
                    Act
                  </button>
                </form>
              )}
            </div>

            <aside className="mission-sidebar" aria-label="Mission status">
              <div className="mission-stat">
                <div className="mission-stat__row">
                  <span className="mission-stat__label">Health</span>
                  <span className="mission-stat__value">{stats.health}/100</span>
                </div>
                <div className="mission-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.health}>
                  <div className={`mission-bar__fill ${healthClass}`} style={{ width: `${stats.health}%` }} />
                </div>
              </div>
              <div className="mission-stat mission-stat__row">
                <span className="mission-stat__label">Credits</span>
                <span className="mission-stat__value">⌬ {stats.credits.toLocaleString()}</span>
              </div>
              <div className="mission-stat mission-stat__row">
                <span className="mission-stat__label">Turn</span>
                <span className="mission-stat__value">{turn}</span>
              </div>
              <div className="mission-stat">
                <span className="mission-stat__label">Objective</span>
                <p className="mission-stat__objective">{stats.objective}</p>
              </div>
              <div className="mission-stat">
                <span className="mission-stat__label">Inventory</span>
                {stats.inventory.length === 0 ? (
                  <p className="mission-stat__empty">Empty pockets.</p>
                ) : (
                  <ul className="mission-inventory">
                    {stats.inventory.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </div>

              {sceneImage && (
                <div className="mission-stat mission-scene">
                  <div className="mission-stat__row">
                    <span className="mission-stat__label">Scene</span>
                    <button className="mission-scene__close" onClick={clearSceneImage} aria-label="Dismiss scene image">✕</button>
                  </div>
                  {sceneImage.status === 'loading' && (
                    <p className="mission-scene__loading">Channelling the Force into pixels…</p>
                  )}
                  {sceneImage.status === 'done' && sceneImage.url && (
                    <a href={sceneImage.url} target="_blank" rel="noreferrer">
                      <img className="mission-scene__img" src={sceneImage.url} alt={sceneImage.prompt ?? 'Scene'} />
                    </a>
                  )}
                  {sceneImage.status === 'error' && <p className="mission-scene__error">⊗ {sceneImage.error}</p>}
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
