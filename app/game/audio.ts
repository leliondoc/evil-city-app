import type { Point, State } from './engine';
import { SoundEvents, type SoundCue, type SoundKind } from './audioEvents';
import { GameMusic } from './music';
import { SOUND_DEFS, effectCalibration } from './audioCatalog';

export type AudioSettings = {
  muted: boolean;
  volume: number;
  musicVolume: number;
};
export type AudioStatus = 'idle' | 'loading' | 'ready' | 'error';
const SETTINGS_KEY = 'evil-city-audio-v1';
export function readAudioSettings(): AudioSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (typeof saved?.muted === 'boolean' && Number.isFinite(saved?.volume))
      return {
        muted: saved.muted,
        volume: Math.max(0, Math.min(1, saved.volume)),
        musicVolume: Number.isFinite(saved.musicVolume)
          ? Math.max(0, Math.min(1, saved.musicVolume))
          : 0.2,
      };
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  return { muted: false, volume: 0.35, musicVolume: 0.2 };
}

export class GameAudio {
  private music = new GameMusic(import.meta.env.BASE_URL);
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private events = new SoundEvents();
  private active = new Map<
    AudioBufferSourceNode,
    { kind: SoundKind; priority: number }
  >();
  private calibration = new Map<string, number>();
  private compressor: DynamicsCompressorNode | null = null;
  private cooldown = new Map<SoundKind, number>();
  private sequence = new Map<SoundKind, number>();
  private paused = false;
  private disposed = false;
  private confirmation = 0;
  private status: AudioStatus = 'idle';

  constructor(
    private settings: AudioSettings,
    private position: (point: Point) => { pan: number; gain: number } | null,
    private onStatus: (status: AudioStatus) => void,
  ) {}

  /** Called synchronously from a click or keyboard gesture for mobile autoplay. */
  unlock() {
    if (
      this.disposed ||
      this.settings.muted ||
      (this.settings.volume === 0 && this.settings.musicVolume === 0)
    )
      return;
    try {
      this.context ??= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -12;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.15;
        this.master.connect(this.compressor).connect(this.context.destination);
        this.master.gain.value = this.settings.volume;
      }
      void this.context.resume().catch(() => {});
      this.music.configure(this.settings.muted, this.settings.musicVolume);
      this.music.unlock(this.context);
      if (this.loading) return;
      this.status = 'loading';
      this.onStatus(this.status);
      const context = this.context;
      this.loading = Promise.all(
        [...new Set(Object.values(SOUND_DEFS).flatMap((def) => def.clips))].map(
          async (name) => {
            const response = await fetch(
              `${import.meta.env.BASE_URL}audio/tommusic/${name}.wav`,
            );
            if (!response.ok) throw new Error('Audio unavailable');
            const buffer = await context.decodeAudioData(
              await response.arrayBuffer(),
            );
            if (!this.disposed) {
              this.buffers.set(name, buffer);
              this.calibration.set(
                name,
                effectCalibration(
                  Array.from({ length: buffer.numberOfChannels }, (_, i) =>
                    buffer.getChannelData(i),
                  ),
                ),
              );
            }
          },
        ),
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
    this.music.configure(settings.muted, settings.musicVolume);
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

  setMusicPaused(paused: boolean) {
    this.music.setPaused(paused);
  }

  update(s: State) {
    // Consume events even while muted so turning sound back on never replays them.
    const cues = this.events.update(s);
    cues.sort(
      (a, b) => SOUND_DEFS[b.kind].priority - SOUND_DEFS[a.kind].priority,
    );
    for (const cue of cues) this.play(cue);
  }

  preview() {
    this.unlock();
    this.play({ kind: 'chop' }, true);
  }

  confirmRecruit() {
    if (this.disposed || this.settings.muted || this.settings.volume === 0)
      return;
    this.unlock();
    const confirmation = ++this.confirmation;
    const clickedAt = performance.now();
    if (this.status === 'ready') this.play({ kind: 'recruit' }, true);
    else
      void this.loading?.then(() => {
        // First interaction may still be decoding. Never replay a backlog of clicks.
        if (
          confirmation === this.confirmation &&
          performance.now() - clickedAt < 1500
        )
          this.play({ kind: 'recruit' }, true);
      });
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
    const definition = SOUND_DEFS[cue.kind];
    if (!preview && now < (this.cooldown.get(cue.kind) ?? 0)) return;
    const location = cue.point ? this.position(cue.point) : { pan: 0, gain: 1 };
    if (!location) return;
    const index = this.sequence.get(cue.kind) ?? 0;
    const variants = definition.clips;
    const buffer = this.buffers.get(variants[index % variants.length]);
    if (!buffer) return;
    const voices = [...this.active.entries()];
    // Two footsteps at most; leave room for impacts, spells and important events.
    if (
      definition.priority === 0 &&
      voices.filter(([, v]) => v.priority === 0).length >= 2
    )
      return;
    if (voices.filter(([, v]) => v.kind === cue.kind).length >= 2) return;
    if (this.active.size >= 8) {
      const quietest = voices.sort((a, b) => a[1].priority - b[1].priority)[0];
      if (quietest[1].priority >= definition.priority) return;
      quietest[0].stop();
      this.active.delete(quietest[0]);
    }
    this.sequence.set(cue.kind, index + 1);
    this.cooldown.set(cue.kind, now + definition.cooldown);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value =
      definition.gain *
      location.gain *
      (this.calibration.get(variants[index % variants.length]) ?? 1);
    const pan = context.createStereoPanner();
    pan.pan.value = location.pan;
    source.connect(gain).connect(pan).connect(this.master);
    if (definition.priority < 3)
      source.playbackRate.value = 0.97 + Math.random() * 0.06;
    this.active.set(source, { kind: cue.kind, priority: definition.priority });
    source.onended = () => {
      this.active.delete(source);
      source.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
    source.start();
  }

  private stop() {
    for (const source of this.active.keys()) {
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
    this.music.dispose();
    this.compressor?.disconnect();
    this.stop();
    void this.context?.close().catch(() => {});
  }
}
