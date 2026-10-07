import type { FactionTheme } from '../types/chat';

interface FactionSelectorProps {
  factions: FactionTheme[];
  activeFactionId: string | null;
  onSelect: (faction: FactionTheme) => void;
}

export default function FactionSelector({ factions, activeFactionId, onSelect }: FactionSelectorProps) {
  return (
    <div className="faction-selector" role="group" aria-label="Select faction theme">
      <span className="faction-selector__label">Faction</span>
      <div className="faction-selector__options">
        {factions.map((faction) => {
          const isActive = faction.id === activeFactionId;
          return (
            <button
              key={faction.id}
              className={`faction-selector__btn${isActive ? ' faction-selector__btn--active' : ''}`}
              style={{ '--faction-color': faction.accent } as React.CSSProperties}
              onClick={() => onSelect(faction)}
              aria-pressed={isActive}
              title={faction.description}
            >
              <span className="faction-selector__swatch" aria-hidden="true" />
              <span className="faction-selector__name">{faction.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
