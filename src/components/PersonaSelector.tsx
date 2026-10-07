import type { Persona } from '../types/chat';

interface PersonaSelectorProps {
  personas: Persona[];
  builtInIds: Set<string>;
  activePersonaId: string;
  onSelect: (persona: Persona) => void;
  onEdit: (persona: Persona) => void;
  onAdd: () => void;
}

export default function PersonaSelector({
  personas,
  builtInIds,
  activePersonaId,
  onSelect,
  onEdit,
  onAdd,
}: PersonaSelectorProps) {
  return (
    <div className="persona-selector" role="group" aria-label="Select AI companion">
      <span className="persona-selector__label">Companion</span>
      <div className="persona-selector__options">
        {personas.map((persona) => {
          const isActive = persona.id === activePersonaId;
          const isCustom = !builtInIds.has(persona.id);
          return (
            <div key={persona.id} className="persona-selector__item">
              <button
                className={`persona-selector__btn${isActive ? ' persona-selector__btn--active' : ''}`}
                style={{ '--persona-color': persona.color } as React.CSSProperties}
                onClick={() => onSelect(persona)}
                aria-pressed={isActive}
                title={persona.description}
              >
                <span className="persona-selector__avatar" aria-hidden="true">
                  {persona.avatar}
                </span>
                <span className="persona-selector__name">{persona.name}</span>
              </button>
              {isCustom && (
                <button
                  className="persona-selector__edit"
                  style={{ '--persona-color': persona.color } as React.CSSProperties}
                  onClick={(e) => { e.stopPropagation(); onEdit(persona); }}
                  aria-label={`Edit ${persona.name}`}
                  title={`Edit ${persona.name}`}
                >
                  ✎
                </button>
              )}
            </div>
          );
        })}
        <button
          className="persona-selector__add"
          onClick={onAdd}
          aria-label="Create new persona"
          title="Create new persona"
        >
          +
        </button>
      </div>
    </div>
  );
}
