import type { CSSProperties } from 'react';
import './Holocron.css';

const FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const;

interface HolocronCubeProps {
  /** Edge length in px */
  size?: number;
  /** Spin faster and glow brighter (e.g. while a response is streaming) */
  active?: boolean;
  /** Render a hologram projector beam beneath the cube */
  projected?: boolean;
}

/** A rotating, faction-tinted 3D holocron built from pure CSS transforms. */
export default function HolocronCube({ size = 64, active = false, projected = false }: HolocronCubeProps) {
  const className = [
    'holocron',
    active && 'holocron--active',
    projected && 'holocron--projected',
  ].filter(Boolean).join(' ');

  return (
    <div className={className} style={{ '--holo-size': `${size}px` } as CSSProperties} aria-hidden="true">
      <div className="holocron__core" />
      <div className="holocron__cube">
        {FACES.map((face) => (
          <span key={face} className={`holocron__face holocron__face--${face}`} />
        ))}
      </div>
    </div>
  );
}
