import { MusicPlaylist, musicBreakDuration } from './musicPlaylist';
import type { MusicTheme } from './musicEvents';

const FADE_IN_SECONDS = 2.5;
const FADE_OUT_SECONDS = 6;
const THEME_TRANSITION_SECONDS = 1.2;

/** Stream one track at a time; keep music independent of simulation speed. */
export class GameMusic {
  private element: HTMLAudioElement | null = null;
  private gain: GainNode | null = null;
  private envelope: GainNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private context: AudioContext | null = null;
  private playlist = new MusicPlaylist();
  private index = this.playlist.next();
  private breakRemaining: number | null = null;
  private breakTimer: ReturnType<typeof setTimeout> | null = null;
  private breakStarted = 0;
  private muted = false;
  private paused = false;
  private playing = false;
  private volume = 0.2;
  private disposed = false;
  private failed = false;
  private theme: MusicTheme | null = null;
  private pendingTheme: MusicTheme | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeInEnd = 0;
  private fadeEnd: number | null = null;
  private darkDue = false;
  private ambientPosition = 0;
  private ambience = false;
  private ambienceDue = false;
  private finishedTracks = 0;
  private syncPlayback = () => this.sync();

  constructor(
    private baseUrl: string,
    private mode: 'game' | 'menu' = 'game',
  ) {
    document.addEventListener('visibilitychange', this.syncPlayback);
  }

  unlock(context: AudioContext) {
    if (this.disposed || this.failed || this.muted || this.volume === 0) return;
    const element = this.prepare();
    if (!this.source) {
      this.context = context;
      context.addEventListener('statechange', this.syncPlayback);
      this.gain = context.createGain();
      this.gain.gain.value = this.volume;
      this.envelope = context.createGain();
      this.envelope.gain.value = 0;
      this.source = context.createMediaElementSource(element);
      this.source
        .connect(this.envelope)
        .connect(this.gain)
        .connect(context.destination);
    }
    this.sync();
  }

  /** Fetch the menu before a gesture, then reuse that exact element for playback. */
  private prepare() {
    if (!this.element) {
      this.element = new Audio();
      this.element.preload = this.mode === 'menu' ? 'auto' : 'none';
      this.element.onended = () => this.ended();
      this.element.onplaying = () => {
        const context = this.context;
        if (!context || this.blocked()) {
          this.sync();
          return;
        }
        this.playing = true;
        if (this.pendingTheme) {
          this.finishTransition();
          return;
        }
        // Fade only once playback really starts, including after buffering.
        this.resetEnvelope();
        this.fadeInEnd = context.currentTime + FADE_IN_SECONDS;
        this.scheduleEnvelope();
      };
      this.element.ondurationchange = () => this.refreshEnvelope();
      this.element.ontimeupdate = () => this.refreshEnvelope();
      this.element.onwaiting = () => {
        this.playing = false;
        if (!this.pendingTheme) this.holdEnvelope();
      };
      // Stop retrying on every click if the optional music files are absent.
      this.element.onerror = () => {
        if (this.pendingTheme) {
          this.finishTransition();
          return;
        }
        if (this.theme) {
          this.theme = null;
          this.load();
          if (this.element) this.element.currentTime = this.ambientPosition;
          this.sync();
          return;
        }
        this.failed = true;
        this.resetEnvelope();
      };
      this.load();
    }
    return this.element;
  }

  configure(muted: boolean, volume: number) {
    const nextVolume = Math.max(0, Math.min(1, volume));
    if (this.gain && this.context && this.volume !== nextVolume) {
      const param = this.gain.gain;
      const now = this.context.currentTime;
      const current = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
      param.setTargetAtTime(nextVolume, now, 0.15);
    }
    this.muted = muted;
    this.volume = nextVolume;
    if (this.mode === 'menu' && !this.blocked()) this.prepare();
    this.sync();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.sync();
  }

  /** One cue per arriving party; never layer music or restart the current theme. */
  playTheme(theme: MusicTheme) {
    if (
      this.mode !== 'game' ||
      this.blocked() ||
      !this.element ||
      this.theme === theme ||
      this.pendingTheme === theme
    )
      return;
    if (theme === 'dark' && (this.theme || this.pendingTheme)) {
      this.darkDue = true;
      return;
    }
    // A new party during the fade changes the destination, not its deadline.
    if (this.pendingTheme) {
      if (this.pendingTheme === 'dark') this.darkDue = true;
      this.pendingTheme = theme;
      return;
    }
    this.pendingTheme = theme;
    this.suspendBreak();
    if (
      !this.playing ||
      this.element.paused ||
      this.element.ended ||
      !this.envelope ||
      !this.context
    ) {
      this.finishTransition();
      return;
    }
    const duration = Math.min(THEME_TRANSITION_SECONDS, this.remaining());
    this.holdEnvelope();
    this.envelope.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + duration,
    );
    this.transitionTimer = setTimeout(
      () => this.finishTransition(),
      duration * 1000,
    );
  }

  private blocked() {
    return (
      this.disposed ||
      this.failed ||
      this.paused ||
      this.muted ||
      this.volume === 0 ||
      document.hidden ||
      (this.context !== null && this.context.state !== 'running')
    );
  }

  private remaining() {
    if (
      !this.element ||
      this.element.loop ||
      !Number.isFinite(this.element.duration)
    )
      return Infinity;
    return (
      Math.max(0, this.element.duration - this.element.currentTime) /
      this.element.playbackRate
    );
  }

  private holdEnvelope() {
    if (!this.envelope || !this.context) return;
    const param = this.envelope.gain;
    const now = this.context.currentTime;
    const current = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
    this.fadeEnd = null;
  }

  private resetEnvelope() {
    this.holdEnvelope();
    this.envelope?.gain.setValueAtTime(0, this.context?.currentTime ?? 0);
    this.fadeInEnd = 0;
  }

  private scheduleEnvelope() {
    if (
      !this.envelope ||
      !this.context ||
      !this.element ||
      !this.playing ||
      this.element.paused ||
      this.pendingTheme
    )
      return;
    const now = this.context.currentTime;
    const remaining = this.remaining();
    const intro = Math.min(Math.max(0, this.fadeInEnd - now), remaining / 2);
    this.holdEnvelope();
    const param = this.envelope.gain;
    if (intro > 0) {
      // Resuming near the end leaves room for both a short rise and the final fade.
      const peak = Math.min(1, remaining / FADE_OUT_SECONDS);
      param.linearRampToValueAtTime(peak, now + intro);
      if (Number.isFinite(remaining))
        param.setValueAtTime(
          peak,
          now + Math.max(intro, remaining - FADE_OUT_SECONDS),
        );
    } else if (remaining > FADE_OUT_SECONDS) {
      param.linearRampToValueAtTime(
        1,
        now + Math.min(0.2, remaining - FADE_OUT_SECONDS),
      );
      if (Number.isFinite(remaining))
        param.setValueAtTime(1, now + remaining - FADE_OUT_SECONDS);
    }
    if (Number.isFinite(remaining)) {
      this.fadeEnd = now + remaining;
      param.linearRampToValueAtTime(0, this.fadeEnd);
    }
  }

  private refreshEnvelope() {
    if (
      !this.context ||
      !this.element ||
      this.element.paused ||
      this.blocked() ||
      this.pendingTheme
    )
      return;
    const remaining = this.remaining();
    // Re-align after metadata, seeking or a stall; ordinary clicks never reset a fade.
    if (
      Number.isFinite(remaining) &&
      (this.fadeEnd === null ||
        Math.abs(this.fadeEnd - this.context.currentTime - remaining) > 0.3)
    )
      this.scheduleEnvelope();
  }

  private cancelTransitionTimer() {
    if (this.transitionTimer !== null) clearTimeout(this.transitionTimer);
    this.transitionTimer = null;
  }

  private finishTransition() {
    this.cancelTransitionTimer();
    if (this.disposed || !this.element || !this.pendingTheme) return;
    if (!this.theme) this.ambientPosition = this.element.currentTime;
    this.theme = this.pendingTheme;
    this.pendingTheme = null;
    this.load();
    this.sync();
  }

  private finishAmbient() {
    if (this.breakRemaining !== null) return;
    if (this.ambience) this.ambience = false;
    else this.ambienceDue = ++this.finishedTracks % 2 === 0;
    this.breakRemaining = musicBreakDuration();
  }

  private ended() {
    if (this.disposed) return;
    this.playing = false;
    this.element?.pause();
    this.resetEnvelope();
    if (this.pendingTheme) {
      if (!this.theme && this.mode === 'game') this.finishAmbient();
      this.finishTransition();
      return;
    }
    if (this.theme) {
      if (this.darkDue) {
        this.darkDue = false;
        this.theme = 'dark';
      } else this.theme = null;
      this.load();
      if (!this.theme && this.element)
        this.element.currentTime = this.ambientPosition;
      this.sync();
      return;
    }
    if (this.mode === 'menu') return;
    this.finishAmbient();
    this.sync();
  }

  private load() {
    if (!this.element) return;
    this.playing = false;
    this.resetEnvelope();
    this.element.loop = this.mode === 'menu';
    this.element.src = `${this.baseUrl}audio/${
      this.mode === 'menu'
        ? 'menu-music.mp3'
        : this.theme
          ? `${this.theme}-theme.mp3`
          : this.ambience
            ? 'ambiance-music.mp3'
            : `alkakrab/spooky-${this.index}.mp3`
    }`;
  }

  private sync() {
    if (
      this.disposed ||
      this.failed ||
      !this.element ||
      !this.context ||
      !this.gain
    )
      return;
    if (this.blocked()) {
      this.playing = false;
      this.element.pause();
      this.suspendBreak();
      this.cancelTransitionTimer();
      this.resetEnvelope();
      return;
    }
    if (this.pendingTheme) {
      if (this.element.paused) this.finishTransition();
      return;
    }
    if (this.breakRemaining !== null && !this.theme) {
      if (this.breakTimer === null) {
        this.breakStarted = performance.now();
        this.breakTimer = setTimeout(() => {
          this.breakTimer = null;
          this.breakRemaining = null;
          if (this.disposed) return;
          if (this.ambienceDue) {
            this.ambience = true;
            this.ambienceDue = false;
          } else this.index = this.playlist.next();
          this.load();
          this.sync();
        }, this.breakRemaining);
      }
      return;
    }
    if (this.element.paused)
      void this.element.play().catch(() => {
        // Autoplay can still require another gesture on some browsers.
      });
  }

  private suspendBreak() {
    if (this.breakTimer === null || this.breakRemaining === null) return;
    clearTimeout(this.breakTimer);
    this.breakTimer = null;
    this.breakRemaining = Math.max(
      0,
      this.breakRemaining - (performance.now() - this.breakStarted),
    );
  }

  dispose() {
    this.disposed = true;
    this.pendingTheme = null;
    this.cancelTransitionTimer();
    this.suspendBreak();
    document.removeEventListener('visibilitychange', this.syncPlayback);
    this.context?.removeEventListener('statechange', this.syncPlayback);
    if (this.element) {
      this.element.onended = null;
      this.element.onplaying = null;
      this.element.ondurationchange = null;
      this.element.ontimeupdate = null;
      this.element.onwaiting = null;
      this.element.onerror = null;
      this.element.pause();
      this.element.removeAttribute('src');
      this.element.load();
    }
    this.source?.disconnect();
    this.envelope?.disconnect();
    this.gain?.disconnect();
  }
}
