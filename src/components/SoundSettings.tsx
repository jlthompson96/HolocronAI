import { useSoundSettings } from '../hooks/useSoundFx';
import { previewSound } from '../utils/sfx';
import './SoundSettings.css';

/** Self-contained sound controls block for the settings panel. */
export default function SoundSettings() {
  const { muted, volume, update } = useSoundSettings();
  const percent = Math.round(volume * 100);

  return (
    <div className="sound-settings">
      <p className="settings-panel__label settings-panel__label--spaced">Sound Effects</p>
      <div className="settings-panel__row sound-settings__row">
        <button
          type="button"
          className={`btn btn--gold sound-settings__toggle ${muted ? 'sound-settings__toggle--muted' : ''}`}
          onClick={() => {
            update({ muted: !muted });
            if (muted) previewSound();
          }}
          aria-pressed={!muted}
          aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
        >
          {muted ? '🔇 Muted' : '🔊 On'}
        </button>
        <input
          type="range"
          className="sound-settings__slider"
          min={0}
          max={100}
          step={5}
          value={percent}
          disabled={muted}
          onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
          onPointerUp={previewSound}
          onKeyUp={previewSound}
          aria-label="Sound effects volume"
          aria-valuetext={`${percent}%`}
        />
        <span className="sound-settings__value">{percent}%</span>
      </div>
    </div>
  );
}
