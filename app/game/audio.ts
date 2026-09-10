import type { Point, State } from './engine';
import { SoundEvents, type SoundCue, type SoundKind } from './audioEvents';

export type AudioSettings = { muted: boolean; volume: number };
export type AudioStatus = 'idle' | 'loading' | 'ready' | 'error';
const SETTINGS_KEY = 'evil-city-audio-v1';
const clips: Record<SoundKind, string[]> = {
  chop: ['chop-1', 'chop-2'],
  mine: ['mine-1', 'mine-2'],
  melee: ['sword-1', 'sword-2'],
  bow: ['bow'],
  magic: ['magic'],
  fire: ['fire'],
  build: ['chop-1', 'chop-2'],
  deposit: ['deposit'],
  complete: ['complete'],
  spawn: ['magic'],
};
const levels: Record<SoundKind, number> = {
  chop: 0.3,
  mine: 0.25,
  melee: 0.35,
  bow: 0.3,
  magic: 0.3,
  fire: 0.3,
  build: 0.2,
  deposit: 0.28,
  complete: 0.4,
  spawn: 0.4,
};
export function readAudioSettings(): AudioSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (typeof saved?.muted === 'boolean' && Number.isFinite(saved?.volume))
      return {
        muted: saved.muted,
        volume: Math.max(0, Math.min(1, saved.volume)),
      };
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  return { muted: false, volume: 0.35 };
}

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private events = new SoundEvents();
  private active = new Set<AudioBufferSourceNode>();
  private cooldown = new Map<SoundKind, number>();
  private sequence = new Map<SoundKind, number>();
  private paused = false;
  private disposed = false;
  private status: AudioStatus = 'idle';

  constructor(
    private settings: AudioSettings,
    private position: (point: Point) => { pan: number; gain: number } | null,
    private onStatus: (status: AudioStatus) => void,
  ) {}

  /** Called synchronously from a click or keyboard gesture for mobile autoplay. */
  unlock() {
    if (this.disposed || this.settings.muted || this.settings.volume === 0)
      return;
    try {
      this.context ??= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.master.gain.value = this.settings.volume;
      }
      void this.context.resume().catch(() => {});
      if (this.loading) return;
      this.status = 'loading';
      this.onStatus(this.status);
      const context = this.context;
      this.loading = Promise.all(
        [...new Set(Object.values(clips).flat())].map(async (name) => {
          const response = await fetch(
            `${import.meta.env.BASE_URL}audio/tommusic/${name}.wav`,
          );
          if (!response.ok) throw new Error('Audio unavailable');
          const buffer = await context.decodeAudioData(
            await response.arrayBuffer(),
          );
          if (!this.disposed) this.buffers.set(name, buffer);
        }),
      )
        .then(() => {
          if (!this.disposed) {
            this.status = 'ready';
            this.onStatus(this.status);
          }
        })
        .catch(() => {
          if (!this.disposed) {
            this.status = 'error';
            this.onStatus(this.status);
            this.loading = null;
          }
        });
    } catch {
      this.status = 'error';
      this.onStatus(this.status);
    }
  }

  configure(settings: AudioSettings) {
    this.settings = settings;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* optional */
    }
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        settings.muted ? 0 : settings.volume,
        this.context.currentTime,
        0.02,
      );
    if (settings.muted || settings.volume === 0) this.stop();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.stop();
  }

  update(s: State) {
    // Consume events even while muted so turning sound back on never replays them.
    for (const cue of this.events.update(s)) this.play(cue);
  }

  preview() {
    this.unlock();
    this.play({ kind: 'chop' }, true);
  }

  private play(cue: SoundCue, preview = false) {
    const context = this.context;
    if (
      this.disposed ||
      !context ||
      !this.master ||
      this.status !== 'ready' ||
      context.state !== 'running' ||
      this.settings.muted ||
      this.settings.volume === 0 ||
      document.hidden ||
      (this.paused && !preview)
    )
      return;
    const now = context.currentTime;
    if (
      this.active.size >= 4 ||
      (!preview && now < (this.cooldown.get(cue.kind) ?? 0))
    )
      return;
    const location = cue.point ? this.position(cue.point) : { pan: 0, gain: 1 };
    if (!location) return;
    const index = this.sequence.get(cue.kind) ?? 0;
    const variants = clips[cue.kind];
    const buffer = this.buffers.get(variants[index % variants.length]);
    if (!buffer) return;
    this.sequence.set(cue.kind, index + 1);
    this.cooldown.set(
      cue.kind,
      now + (cue.kind === 'complete' || cue.kind === 'spawn' ? 1 : 0.6),
    );
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = levels[cue.kind] * location.gain;
    const pan = context.createStereoPanner();
    pan.pan.value = location.pan;
    source.connect(gain).connect(pan).connect(this.master);
    this.active.add(source);
    source.onended = () => {
      this.active.delete(source);
      source.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
    source.start();
  }

  private stop() {
    for (const source of this.active) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.active.clear();
  }

  dispose() {
    this.disposed = true;
    this.stop();
    void this.context?.close().catch(() => {});
  }
}
