// Synthesized sound effects (Web Audio API — no audio assets).
// The AudioContext is created lazily on the first user gesture so browsers'
// autoplay policies are respected.

export interface SoundSettings {
  muted: boolean;
  volume: number; // 0..1
}

const STORAGE_KEY = 'swc-sound-settings';
const DEFAULT_SETTINGS: SoundSettings = { muted: false, volume: 0.35 };

function loadSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_SETTINGS.muted,
      volume:
        typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1
          ? parsed.volume
          : DEFAULT_SETTINGS.volume,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let settings: SoundSettings = loadSettings();
const listeners = new Set<() => void>();

export function getSoundSettings(): SoundSettings {
  return settings;
}

export function setSoundSettings(patch: Partial<SoundSettings>): void {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — keep in-memory value */
  }
  if (master && ctx) master.gain.setTargetAtTime(settings.volume, ctx.currentTime, 0.02);
  listeners.forEach((l) => l());
}

export function subscribeSoundSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── AudioContext (lazy) ─────────────────────────────────────────
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    ensureContext();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

/** Returns a ready context only if one exists already (never creates outside a gesture). */
function activeContext(): AudioContext | null {
  if (settings.muted || settings.volume <= 0 || !ctx || !master) return null;
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function getNoise(ac: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ac.sampleRate) {
    const len = ac.sampleRate * 1.5;
    noiseBuffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function envelope(ac: AudioContext, peak: number, attack: number, hold: number, release: number): GainNode {
  const g = ac.createGain();
  const t = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return g;
}

// ── Effects ─────────────────────────────────────────────────────

/** Lightsaber hum + swing: detuned saw drone with a Doppler-ish pitch bend. */
export function playSaberSwing(): void {
  const ac = activeContext();
  if (!ac || !master) return;
  const t = ac.currentTime;
  const dur = 0.55;

  const env = envelope(ac, 0.35, 0.04, 0.12, 0.38);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(600, t);
  lp.frequency.linearRampToValueAtTime(2200, t + 0.15);
  lp.frequency.exponentialRampToValueAtTime(500, t + dur);
  lp.Q.value = 4;

  const freqs = [90, 91.5, 180];
  const oscs = freqs.map((f, i) => {
    const o = ac.createOscillator();
    o.type = i === 2 ? 'triangle' : 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * 1.35, t + 0.15);
    o.frequency.exponentialRampToValueAtTime(f * 0.9, t + dur);
    o.connect(lp);
    return o;
  });

  // Slight amplitude wobble for the "hum"
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = 22;
  lfoGain.gain.value = 0.08;
  lfo.connect(lfoGain).connect(env.gain);

  lp.connect(env).connect(master);
  [...oscs, lfo].forEach((o) => {
    o.start(t);
    o.stop(t + dur + 0.05);
  });
}

/** Soft droid blip: two quick sine chirps. */
export function playDroidBlip(): void {
  const ac = activeContext();
  if (!ac || !master) return;
  const notes: Array<[number, number, number]> = [
    // [start offset, from Hz, to Hz]
    [0, 1400, 2100],
    [0.09, 1900, 1250],
  ];
  for (const [offset, from, to] of notes) {
    const t = ac.currentTime + offset;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + 0.07);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.1);
  }
}

/** Hyperspace whoosh: band-passed noise sweep + rising sine. */
export function playHyperspaceWhoosh(): void {
  const ac = activeContext();
  if (!ac || !master) return;
  const t = ac.currentTime;
  const dur = 0.8;

  const src = ac.createBufferSource();
  src.buffer = getNoise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(4000, t + dur * 0.6);
  bp.frequency.exponentialRampToValueAtTime(1200, t + dur);
  const nEnv = envelope(ac, 0.45, 0.25, 0.1, dur - 0.35);
  src.connect(bp).connect(nEnv).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);

  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(900, t + dur * 0.6);
  const oEnv = envelope(ac, 0.08, 0.2, 0.05, dur - 0.25);
  o.connect(oEnv).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Plays a short preview — call from a click handler so the context can start. */
export function previewSound(): void {
  ensureContext();
  playDroidBlip();
}
