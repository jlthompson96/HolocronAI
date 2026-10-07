import HolocronCube from './HolocronCube';

interface ChatHeaderProps {
  onToggleSettings: () => void;
  settingsOpen: boolean;
  onClearChat: () => void;
  onToggleArchive: () => void;
  archiveOpen: boolean;
  onToggleDebate?: () => void;
  debateOpen?: boolean;
  onToggleMission?: () => void;
  missionOpen?: boolean;
  /** Spins the header holocron up while a response is streaming */
  isActive?: boolean;
}

export default function ChatHeader({ onToggleSettings, settingsOpen, onClearChat, onToggleArchive, archiveOpen, onToggleDebate, debateOpen, onToggleMission, missionOpen, isActive = false }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <div className="chat-header__title-group">
        <HolocronCube size={20} active={isActive} />
        <h1 className="chat-header__title">HolocronAI</h1>
      </div>
      <div className="chat-header__actions">
        <button
          className="btn btn--ghost"
          onClick={onClearChat}
          title="Clear conversation"
          aria-label="Clear conversation"
        >
          Clear Chat
        </button>
        <button
          className={`btn btn--ghost ${archiveOpen ? 'btn--active' : ''}`}
          onClick={onToggleArchive}
          title="Open holocron archive"
          aria-label="Toggle holocron archive"
          aria-expanded={archiveOpen}
        >
          ◈ Archive
        </button>
        {onToggleDebate && (
          <button
            className={`btn btn--ghost ${debateOpen ? 'btn--active' : ''}`}
            onClick={onToggleDebate}
            title="Stage a debate between two personas"
            aria-label="Toggle debate arena"
            aria-expanded={!!debateOpen}
          >
            ⚔ Debate
          </button>
        )}
        {onToggleMission && (
          <button
            className={`btn btn--ghost ${missionOpen ? 'btn--active' : ''}`}
            onClick={onToggleMission}
            title="Play an interactive mission"
            aria-label="Toggle missions"
            aria-expanded={!!missionOpen}
          >
            ◉ Missions
          </button>
        )}
        <button
          className={`btn btn--ghost ${settingsOpen ? 'btn--active' : ''}`}
          onClick={onToggleSettings}
          title="Configure server settings"
          aria-label="Toggle settings panel"
          aria-expanded={settingsOpen}
        >
          ⚙ Settings
        </button>
      </div>
    </header>
  );
}
