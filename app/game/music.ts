/** Stream one track at a time; keep music independent of simulation speed. */
export class GameMusic {
  private element: HTMLAudioElement | null = null;
  private gain: GainNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private context: AudioContext | null = null;
  private index = 1;
  private muted = false;
  private volume = 0.2;
  private disposed = false;
  private failed = false;
  private hidden = () => this.sync();

  constructor(private baseUrl: string) {
    document.addEventListener('visibilitychange', this.hidden);
  }

  unlock(context: AudioContext) {
    if (this.disposed || this.failed || this.muted || this.volume === 0) return;
    if (!this.element) {
      this.context = context;
      this.element = new Audio();
      this.element.preload = 'none';
      this.gain = context.createGain();
      this.gain.gain.value = 0;
      this.source = context.createMediaElementSource(this.element);
      this.source.connect(this.gain).connect(context.destination);
      this.element.onended = () => {
        this.index = (this.index % 8) + 1;
        this.load();
        this.sync();
      };
      // Stop retrying on every click if the optional music files are absent.
      this.element.onerror = () => {
        this.failed = true;
      };
      this.load();
    }
    this.sync();
  }

  configure(muted: boolean, volume: number) {
    this.muted = muted;
    this.volume = volume;
    this.sync();
  }

  private load() {
    if (!this.element || !this.context || !this.gain) return;
    this.gain.gain.cancelScheduledValues(this.context.currentTime);
    this.gain.gain.setValueAtTime(0, this.context.currentTime);
    this.element.src = `${this.baseUrl}audio/alkakrab/spooky-${this.index}.mp3`;
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
    if (this.muted || this.volume === 0 || document.hidden) {
      this.element.pause();
      return;
    }
    this.gain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.35);
    if (this.element.paused)
      void this.element.play().catch(() => {
        // Autoplay can still require another gesture on some browsers.
      });
  }

  dispose() {
    this.disposed = true;
    document.removeEventListener('visibilitychange', this.hidden);
    if (this.element) {
      this.element.onended = null;
      this.element.onerror = null;
      this.element.pause();
      this.element.removeAttribute('src');
      this.element.load();
    }
    this.source?.disconnect();
    this.gain?.disconnect();
  }
}
