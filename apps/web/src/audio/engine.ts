import { NYC_TZ } from "@cozy/shared";

/**
 * Layered, time-of-day soundtrack. See docs/AUDIO.md for the stem contract.
 *
 * Every stem is a loop of identical length, and all of them start on the same
 * AudioContext clock tick, so they stay phase-locked forever. A "scene" is
 * just which stems are audible; moving between scenes ramps per-stem gains on
 * a bar boundary. Stems shared by two scenes keep playing through the change,
 * which is how pieces of one track carry into the next.
 */

type Placeholder =
  | { type: "pad"; notes: number[] }
  | { type: "bass"; notes: number[] }
  | { type: "kick" }
  | { type: "hat" };

interface StemDef {
  id: string;
  /** bed = plays whenever its scene is on; energy = also scaled by how hot the area around you is */
  role: "bed" | "energy";
  scenes: string[];
  url: string | null;
  placeholder?: Placeholder;
}

interface Manifest {
  bpm: number;
  beatsPerBar: number;
  loopBars: number;
  fadeBars: number;
  scenes: { id: string; fromHour: number; toHour: number }[];
  stems: StemDef[];
}

const midiHz = (n: number) => 440 * 2 ** ((n - 69) / 12);

function renderPlaceholder(ctx: BaseAudioContext, p: Placeholder, m: Manifest, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(seconds * sr), sr);
  const out = buf.getChannelData(0);
  const beat = 60 / m.bpm;
  const bar = beat * m.beatsPerBar;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    let v = 0;
    if (p.type === "pad") {
      for (const n of p.notes) v += Math.sin(2 * Math.PI * midiHz(n) * t) * 0.06;
      v *= 0.75 + 0.25 * Math.sin((2 * Math.PI * t) / (bar * 2)); // slow swell, period divides the loop
    } else if (p.type === "bass") {
      const note = p.notes[Math.floor(t / bar) % p.notes.length]!;
      const tb = t % (beat / 2);
      v = Math.sin(2 * Math.PI * midiHz(note) * t) * 0.18 * Math.exp(-tb * 6);
    } else if (p.type === "kick") {
      const tb = t % beat;
      const f = 45 + 80 * Math.exp(-tb * 30);
      v = Math.sin(2 * Math.PI * f * tb) * 0.5 * Math.exp(-tb * 8);
    } else {
      const tb = (t + beat / 2) % beat; // offbeats
      v = (Math.random() * 2 - 1) * 0.06 * Math.exp(-tb * 60);
    }
    out[i] = v;
  }
  return buf;
}

export function nycHour(d = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: NYC_TZ, hour: "numeric", hourCycle: "h23" }).format(d));
}

export function sceneForHour(m: Pick<Manifest, "scenes">, hour: number): string {
  for (const s of m.scenes) {
    const inRange = s.fromHour <= s.toHour ? hour >= s.fromHour && hour < s.toHour : hour >= s.fromHour || hour < s.toHour;
    if (inRange) return s.id;
  }
  return m.scenes[0]!.id;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private manifest!: Manifest;
  private stems: { def: StemDef; gain: GainNode }[] = [];
  private t0 = 0;
  private energy = 0.3;
  scene: string | null = null;

  /** Must be called from a user gesture (browser autoplay rules). */
  async start(manifestUrl = "/audio/manifest.json") {
    this.manifest = (await (await fetch(manifestUrl)).json()) as Manifest;
    const m = this.manifest;
    const ctx = new AudioContext();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    const loopSeconds = (m.loopBars * m.beatsPerBar * 60) / m.bpm;

    const buffers = await Promise.all(
      m.stems.map(async (s) => {
        if (s.url) return ctx.decodeAudioData(await (await fetch(s.url)).arrayBuffer());
        return renderPlaceholder(ctx, s.placeholder ?? { type: "pad", notes: [60] }, m, loopSeconds);
      }),
    );

    this.t0 = ctx.currentTime + 0.1;
    this.stems = m.stems.map((def, i) => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(master);
      const src = ctx.createBufferSource();
      src.buffer = buffers[i]!;
      src.loop = true;
      src.loopEnd = loopSeconds;
      src.connect(gain);
      src.start(this.t0);
      return { def, gain };
    });
    this.setScene(sceneForHour(m, nycHour()), true);
  }

  private nextBar(): number {
    const ctx = this.ctx!;
    const bar = (this.manifest.beatsPerBar * 60) / this.manifest.bpm;
    const elapsed = Math.max(0, ctx.currentTime - this.t0);
    return this.t0 + Math.ceil(elapsed / bar + 1e-6) * bar;
  }

  private target(def: StemDef): number {
    if (!this.scene || !def.scenes.includes(this.scene)) return 0;
    return def.role === "energy" ? this.energy : 1;
  }

  private apply(at: number, rampSeconds: number) {
    for (const s of this.stems) {
      const g = s.gain.gain;
      g.cancelScheduledValues(at);
      g.setValueAtTime(g.value, at);
      g.linearRampToValueAtTime(this.target(s.def), at + rampSeconds);
    }
  }

  setScene(id: string, immediate = false) {
    if (!this.ctx || id === this.scene) return;
    this.scene = id;
    const bar = (this.manifest.beatsPerBar * 60) / this.manifest.bpm;
    this.apply(immediate ? this.ctx.currentTime : this.nextBar(), immediate ? 1 : bar * this.manifest.fadeBars);
  }

  /** 0..1, e.g. heat of the events around the listener. */
  setEnergy(x: number) {
    const v = Math.min(1, Math.max(0.15, x));
    if (!this.ctx || Math.abs(v - this.energy) < 0.05) return;
    this.energy = v;
    this.apply(this.ctx.currentTime, 1.5);
  }

  /** Re-evaluate the scene from the clock (call every minute or so). `hourOverride` is for testing. */
  tick(hourOverride?: number) {
    if (!this.ctx) return;
    this.setScene(sceneForHour(this.manifest, hourOverride ?? nycHour()));
  }

  async stop() {
    await this.ctx?.close();
    this.ctx = null;
    this.scene = null;
    this.stems = [];
  }
}
