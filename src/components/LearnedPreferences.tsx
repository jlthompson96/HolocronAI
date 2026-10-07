import { REACTIONS } from '../constants/config';
import type { StyleNote } from '../utils/preferenceNotes';
import './LearnedPreferences.css';

interface LearnedPreferencesProps {
  personaName: string;
  notes: StyleNote[];
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onRemoveNote: (key: string) => void;
  onClear: () => void;
}

export default function LearnedPreferences({
  personaName,
  notes,
  enabled,
  onToggleEnabled,
  onRemoveNote,
  onClear,
}: LearnedPreferencesProps) {
  return (
    <div className="settings-panel learned-prefs" role="region" aria-label="Learned preferences">
      <div className="learned-prefs__head">
        <p className="settings-panel__label learned-prefs__title">
          Learned Preferences — {personaName}{' '}
          <span className="learned-prefs__count">✦ {notes.length} learned</span>
        </p>
        <label className="learned-prefs__toggle">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggleEnabled(e.target.checked)} />
          Shape persona from reactions
        </label>
      </div>
      <p className="settings-panel__hint learned-prefs__hint">
        Reactions on replies teach this persona your style. Removing a reaction forgets it.
        {!enabled && ' (Paused — notes are kept but not sent.)'}
      </p>

      {notes.length === 0 ? (
        <p className="learned-prefs__empty">No preferences learned yet. React to a reply to teach this persona.</p>
      ) : (
        <>
          <ul className="learned-prefs__list">
            {notes.map((n) => {
              const reaction = REACTIONS.find((r) => r.id === n.reactionId);
              return (
                <li key={n.key} className={`learned-prefs__item learned-prefs__item--${n.sentiment}`}>
                  <span className="learned-prefs__symbol" title={reaction?.label} aria-hidden="true">
                    {reaction?.symbol ?? '•'}
                  </span>
                  <span className="learned-prefs__text">
                    <strong>{n.sentiment === 'liked' ? 'Liked' : 'Disliked'}:</strong> {n.summary}
                  </span>
                  <button
                    className="learned-prefs__remove"
                    onClick={() => onRemoveNote(n.key)}
                    aria-label="Forget this preference"
                    title="Forget this preference"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
          <button className="btn btn--ghost learned-prefs__clear" onClick={onClear}>
            Clear learned preferences
          </button>
        </>
      )}
    </div>
  );
}
