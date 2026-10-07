import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import './HyperspaceTransition.css';

interface HyperspaceTransitionProps {
  /** The overlay plays whenever this key changes (e.g. the active persona id). Not on first mount. */
  triggerKey: string;
  /** Overlay duration in ms. */
  duration?: number;
}

interface Streak {
  id: number;
  angle: string;
  delay: string;
  length: string;
  offset: string;
  thickness: string;
}

function generateStreaks(count: number): Streak[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: `${(360 / count) * i + Math.random() * (360 / count)}deg`,
    delay: `${Math.random() * 120}ms`,
    length: `${Math.random() * 30 + 25}vmax`,
    offset: `${Math.random() * 8 + 2}vmax`,
    thickness: `${Math.random() < 0.25 ? 2 : 1}px`,
  }));
}

export default function HyperspaceTransition({ triggerKey, duration = 700 }: HyperspaceTransitionProps) {
  const [run, setRun] = useState(0);
  const prevKey = useRef(triggerKey);
  const streaks = useMemo(() => generateStreaks(72), []);

  useEffect(() => {
    if (prevKey.current === triggerKey) return;
    prevKey.current = triggerKey;
    setRun((n) => n + 1);
    const t = window.setTimeout(() => setRun(0), duration);
    return () => window.clearTimeout(t);
  }, [triggerKey, duration]);

  if (!run) return null;

  return (
    <div
      key={run}
      className="hyperspace"
      aria-hidden="true"
      style={{ '--hyperspace-duration': `${duration}ms` } as CSSProperties}
    >
      {streaks.map((s) => (
        <span
          key={s.id}
          className="hyperspace__streak"
          style={
            {
              '--hs-angle': s.angle,
              '--hs-length': s.length,
              '--hs-offset': s.offset,
              height: s.thickness,
              animationDelay: s.delay,
            } as CSSProperties
          }
        />
      ))}
      <div className="hyperspace__flash" />
    </div>
  );
}
