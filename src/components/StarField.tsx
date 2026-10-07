import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import './StarField.css';

interface Star {
  id: number;
  top: string;
  left: string;
  size: string;
  duration: string;
  delay: string;
  opacity: string;
  /** How strongly this star picks up the faction tint (0..100%) */
  tint: string;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 2 + 1}px`,
    duration: `${Math.random() * 3 + 2}s`,
    delay: `${Math.random() * 5}s`,
    opacity: `${Math.random() * 0.5 + 0.3}`,
    tint: `${Math.round(Math.random() * 55 + 15)}%`,
  }));
}

interface StarFieldProps {
  /** Faction accent color; stars and nebula tint toward it. Falls back to the theme's --gold. */
  accent?: string;
}

export default function StarField({ accent }: StarFieldProps = {}) {
  const stars = useMemo(() => generateStars(150), []);

  return (
    <div
      className="starfield"
      aria-hidden="true"
      style={accent ? ({ '--starfield-tint': accent } as CSSProperties) : undefined}
    >
      <div className="starfield__nebula" />
      {stars.map((star) => (
        <span
          key={star.id}
          className="star"
          style={
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDuration: star.duration,
              animationDelay: star.delay,
              opacity: star.opacity,
              '--star-tint': star.tint,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
