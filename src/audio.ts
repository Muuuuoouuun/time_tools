// ---------------------------------------------------------------------------
// Audio engine — synthesized alarm sounds (Web Audio), custom uploaded audio,
// and the completion "ring" loop. Ported from the prototype's audio methods.
// ---------------------------------------------------------------------------

type Voice = [freq: number, offset: number, dur: number, type: OscillatorType, peak: number];

const PATTERNS: Record<string, Voice[]> = {
  chime: [[880, 0, 0.55, 'sine', 0.3], [1174.7, 0.15, 0.55, 'sine', 0.3], [1568, 0.3, 0.8, 'sine', 0.28]],
  bell: [[1568, 0, 1.2, 'triangle', 0.28], [3136, 0, 0.5, 'sine', 0.12], [2093, 0.28, 1.0, 'triangle', 0.2]],
  digital: [[988, 0, 0.09, 'square', 0.16], [988, 0.13, 0.09, 'square', 0.16], [988, 0.26, 0.13, 'square', 0.16]],
  marimba: [[659.25, 0, 0.28, 'sine', 0.3], [784, 0.09, 0.28, 'sine', 0.3], [987.77, 0.18, 0.28, 'sine', 0.3], [1318.5, 0.27, 0.45, 'sine', 0.3]],
  soft: [[523.25, 0, 1.5, 'sine', 0.22], [659.25, 0.22, 1.5, 'sine', 0.2], [784, 0.44, 1.4, 'sine', 0.16]],
};

const RING_INTERVAL_MS = 1700;
const RING_MAX_MS = 30000;

export class AudioEngine {
  private ac: AudioContext | null = null;
  private customAudio: HTMLAudioElement | null = null;
  private rings = new Map<number, { iv: ReturnType<typeof setInterval>; to: ReturnType<typeof setTimeout> }>();

  constructor(private getVolume: () => number) {}

  /** Lazily create/resume the AudioContext. Call from a user gesture to satisfy autoplay policy. */
  ensureAC(): AudioContext | null {
    if (!this.ac) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ac = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ac.state === 'suspended') void this.ac.resume();
    return this.ac;
  }

  /** Unlock audio on first user interaction. */
  unlock(): void {
    this.ensureAC();
  }

  play(sound: string): void {
    const v = Math.max(0, Math.min(1, this.getVolume() / 100));
    if (v <= 0) return;

    if (sound === 'custom' && this.customAudio) {
      try {
        const a = this.customAudio.cloneNode() as HTMLAudioElement;
        a.volume = v;
        void a.play();
      } catch {
        /* ignore playback errors */
      }
      return;
    }

    const ac = this.ensureAC();
    if (!ac) return;
    const t0 = ac.currentTime;
    const voices = PATTERNS[sound] || PATTERNS.chime;
    for (const [f, off, dur, type, peak] of voices) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = f;
      o.connect(g);
      g.connect(ac.destination);
      const st = t0 + off;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(peak * v, st + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      o.start(st);
      o.stop(st + dur + 0.03);
    }
  }

  /** Start the repeating completion alarm for a timer id (repeats until stopped or 30s). */
  startRing(id: number, sound: string): void {
    this.play(sound);
    if (this.rings.has(id)) return;
    const iv = setInterval(() => this.play(sound), RING_INTERVAL_MS);
    const to = setTimeout(() => this.stopRing(id), RING_MAX_MS);
    this.rings.set(id, { iv, to });
  }

  stopRing(id: number): void {
    const r = this.rings.get(id);
    if (!r) return;
    clearInterval(r.iv);
    clearTimeout(r.to);
    this.rings.delete(id);
  }

  stopAllRings(): void {
    for (const id of [...this.rings.keys()]) this.stopRing(id);
  }

  /** Register an uploaded custom sound (object URL or data URL). */
  setCustom(url: string): void {
    try {
      this.customAudio = new Audio(url);
    } catch {
      this.customAudio = null;
    }
  }
}
