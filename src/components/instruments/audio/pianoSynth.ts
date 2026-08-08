// Polyphonic piano synthesizer — pure Web Audio, no samples.
// Voice: triangle fundamental + detuned copy + 2 sine partials, hammer-noise
// transient, key-tracked lowpass sweeping down, register-dependent decay.
import { getMasterBus } from "./engine";

const MAX_VOICES = 24;

interface PianoVoice {
  midi: number;
  startedAt: number;
  oscs: OscillatorNode[];
  nodes: AudioNode[]; // every node to disconnect on teardown
  env: GainNode;
  released: boolean;
  autoStopId: number;
}

const active: PianoVoice[] = []; // insertion order = age (oldest first)
const held = new Map<number, PianoVoice>();

let noiseBuffer: AudioBuffer | null = null;

function hammerNoise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const n = Math.floor(ctx.sampleRate * 0.05);
    noiseBuffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

function teardown(v: PianoVoice): void {
  for (const o of v.oscs) o.onended = null;
  for (const n of v.nodes) n.disconnect();
}

function releaseVoice(v: PianoVoice, relSeconds: number): void {
  if (v.released) return;
  v.released = true;
  window.clearTimeout(v.autoStopId);
  if (held.get(v.midi) === v) held.delete(v.midi);
  const i = active.indexOf(v);
  if (i !== -1) active.splice(i, 1);

  const { ctx } = getMasterBus();
  const now = ctx.currentTime;
  const g = v.env.gain;
  const cur = Math.max(g.value, 0.0001);
  g.cancelScheduledValues(0);
  g.setValueAtTime(cur, now);
  g.setTargetAtTime(0.0001, now, Math.max(0.005, relSeconds / 4));

  const stopAt = now + relSeconds + 0.08;
  for (const o of v.oscs) o.stop(stopAt);
}

export function noteOn(midi: number): void {
  const { ctx, output } = getMasterBus();

  const prev = held.get(midi);
  if (prev) releaseVoice(prev, 0.05); // retrigger: quick fade of old voice

  while (active.length >= MAX_VOICES) {
    const oldest = active[0];
    if (!oldest) break;
    releaseVoice(oldest, 0.03); // steal oldest
  }

  const now = ctx.currentTime;
  const f = midiToFreq(midi);
  // register position: 0 at C2 (36) -> 1 at C7 (96)
  const t = Math.min(1, Math.max(0, (midi - 36) / 60));
  // exponential interpolation ~7s bass -> ~1.5s treble
  const decay = 7 * Math.pow(1.5 / 7, t);
  const peak = 0.24 * (0.85 + 0.3 * t); // slight equal-loudness compensation

  const nodes: AudioNode[] = [];
  const oscs: OscillatorNode[] = [];

  // amplitude envelope: fast attack, exponential decay while held
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(peak, now + 0.005);
  env.gain.setTargetAtTime(0.0001, now + 0.005, decay / 3);
  env.connect(output);
  nodes.push(env);

  // key-tracked lowpass: opens bright at attack, sweeps down
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  const bright = Math.min(f * 11, 14000);
  const settled = Math.min(Math.max(f * 2.6, 300), 8000);
  filter.frequency.setValueAtTime(bright, now);
  filter.frequency.setTargetAtTime(settled, now + 0.012, 0.12 + 0.35 * (1 - t));
  filter.connect(env);
  nodes.push(filter);

  const partials: Array<{
    ratio: number;
    gain: number;
    type: OscillatorType;
    detune: number;
  }> = [
    { ratio: 1, gain: 1, type: "triangle", detune: 0 },
    { ratio: 1, gain: 0.45, type: "triangle", detune: 2 }, // detuned copy
    { ratio: 2, gain: 0.22, type: "sine", detune: 4 }, // slight stretch
    { ratio: 3, gain: 0.11, type: "sine", detune: 7 },
  ];
  for (const p of partials) {
    const pf = f * p.ratio;
    if (pf > ctx.sampleRate * 0.45) continue;
    const osc = ctx.createOscillator();
    osc.type = p.type;
    osc.frequency.value = pf;
    osc.detune.value = p.detune;
    const og = ctx.createGain();
    og.gain.value = p.gain;
    osc.connect(og);
    og.connect(filter);
    osc.start(now);
    oscs.push(osc);
    nodes.push(osc, og);
  }

  // hammer transient: short filtered noise burst, key-tracked color
  const noise = ctx.createBufferSource();
  noise.buffer = hammerNoise(ctx);
  const nf = ctx.createBiquadFilter();
  nf.type = "bandpass";
  nf.frequency.value = Math.min(f * 7, 9000);
  nf.Q.value = 0.8;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.55, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  noise.connect(nf);
  nf.connect(ng);
  ng.connect(env);
  noise.onended = () => {
    noise.disconnect();
    nf.disconnect();
    ng.disconnect();
  };
  noise.start(now);
  nodes.push(noise, nf, ng);

  const voice: PianoVoice = {
    midi,
    startedAt: now,
    oscs,
    nodes,
    env,
    released: false,
    autoStopId: 0,
  };
  const first = oscs[0];
  if (first) first.onended = () => teardown(voice);
  // safety: free the voice once its natural decay is inaudible
  voice.autoStopId = window.setTimeout(
    () => releaseVoice(voice, 0.25),
    decay * 2000 + 800,
  );

  active.push(voice);
  held.set(midi, voice);
}

export function noteOff(midi: number): void {
  const v = held.get(midi);
  if (v) releaseVoice(v, 0.25);
}

export function allNotesOff(): void {
  for (const v of [...active]) releaseVoice(v, 0.1);
}
