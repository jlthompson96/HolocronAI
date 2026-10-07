import type { ArchivedSession } from '../types/chat';
import { PERSONAS } from '../constants/config';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

interface HolocronArchiveProps {
  sessions: ArchivedSession[];
  onSave: () => void;
  canSave: boolean;
  onRestore: (session: ArchivedSession) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function HolocronArchive({
  sessions,
  onSave,
  canSave,
  onRestore,
  onDelete,
  onClose,
}: HolocronArchiveProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="archive-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="archive-drawer" aria-label="Holocron Archive">
        <div className="archive-drawer__header">
          <div className="archive-drawer__title-group">
            <span className="archive-drawer__glyph" aria-hidden="true">◈</span>
            <h2 className="archive-drawer__title">Holocron Archive</h2>
          </div>
          <button
            className="btn btn--ghost archive-drawer__close"
            onClick={onClose}
            aria-label="Close archive"
          >
            ✕
          </button>
        </div>

        <div className="archive-drawer__save-row">
          <button
            className="btn btn--gold archive-drawer__save-btn"
            onClick={onSave}
            disabled={!canSave}
            title={canSave ? 'Save current conversation' : 'No messages to save'}
          >
            ⬡ Save Current Recording
          </button>
        </div>

        <div className="archive-drawer__list" role="list">
          {sessions.length === 0 ? (
            <div className="archive-drawer__empty">
              <span className="archive-drawer__empty-glyph" aria-hidden="true">◎</span>
              <p>The archive is empty.</p>
              <p className="archive-drawer__empty-sub">No recordings found in the holocron.</p>
            </div>
          ) : (
            sessions.map((session) => {
              const persona = PERSONAS.find((p) => p.id === session.personaId);
              const userCount = session.messages.filter((m) => m.role === 'user').length;
              return (
                <div key={session.id} className="archive-session" role="listitem">
                  <div className="archive-session__meta">
                    {persona && (
                      <span
                        className="archive-session__persona"
                        style={{ color: persona.color }}
                        title={persona.name}
                        aria-label={`Companion: ${persona.name}`}
                      >
                        {persona.avatar}
                      </span>
                    )}
                    <span className="archive-session__time">{formatDate(session.savedAt)}</span>
                    <span className="archive-session__count">{userCount} msg{userCount !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="archive-session__title">{session.title}</p>
                  <div className="archive-session__actions">
                    <button
                      className="btn btn--ghost archive-session__restore"
                      onClick={() => onRestore(session)}
                      aria-label={`Restore recording: ${session.title}`}
                    >
                      ▶ Restore
                    </button>
                    <button
                      className="btn btn--ghost archive-session__delete"
                      onClick={() => onDelete(session.id)}
                      aria-label={`Delete recording: ${session.title}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
