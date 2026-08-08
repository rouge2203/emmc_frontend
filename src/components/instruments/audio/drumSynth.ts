// Synthesized drum kit voices. Pure Web Audio, all routed to the master bus.
import { getMasterBus } from "./engine";

const METAL_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21] as const;

// ---- shared resources -----------------------------------------------------

let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const length = Math.floor(ctx.sampleRate * 2);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

let satCurve: Float32Array<ArrayBuffer> | null = null;

function getSatCurve(): Float32Array<ArrayBuffer> {
  if (!satCurve) {
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(1.8 * x);
    }
    satCurve = curve;
  }
  return satCurve;
}

// ±8% gain humanization per hit
function humanize(base: number): number {
  return base * (0.92 + Math.random() * 0.16);
}

// every live voice's envelope gains, so stopAllDrums() can silence them all
const activeEnvs = new Set<GainNode>();

function attachCleanup(
  src: AudioScheduledSourceNode | undefined,
  nodes: AudioNode[],
  extra?: () => void,
): void {
  if (!src) return;
  src.onended = () => {
    for (const n of nodes) {
      if (n instanceof GainNode) activeEnvs.delete(n);
      n.disconnect();
    }
    extra?.();
  };
}

// ---- kick -----------------------------------------------------------------

export function kick(): void {
  const { ctx, output } = getMasterBus();
  const t = ctx.currentTime;
  const v = humanize(0.9);
  const nodes: AudioNode[] = [];

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

  const env = ctx.createGain();
  env.gain.setValueAtTime(v, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  activeEnvs.add(env);

  const shaper = ctx.createWaveShaper();
  shaper.curve = getSatCurve();

  osc.connect(env);
  env.connect(shaper);
  shaper.connect(output);
  osc.start(t);
  osc.stop(t + 0.42);
  nodes.push(osc, env, shaper);

  // 2ms click transient
  const click = ctx.createBufferSource();
  click.buffer = getNoiseBuffer(ctx);
  const clickEnv = ctx.createGain();
  clickEnv.gain.setValueAtTime(0.5 * v, t);
  clickEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.002);
  activeEnvs.add(clickEnv);
  click.connect(clickEnv);
  clickEnv.connect(output);
  click.start(t);
  click.stop(t + 0.004);
  nodes.push(click, clickEnv);

  attachCleanup(osc, nodes);
}

// ---- snare ----------------------------------------------------------------

export function snare(): void {
  const { ctx, output } = getMasterBus();
  const t = ctx.currentTime;
  const v = humanize(0.8);
  const nodes: AudioNode[] = [];

  const bodyEnv = ctx.createGain();
  bodyEnv.gain.setValueAtTime(0.5 * v, t);
  bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  activeEnvs.add(bodyEnv);
  bodyEnv.connect(output);
  nodes.push(bodyEnv);

  for (const f of [185, 330]) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    osc.connect(bodyEnv);
    osc.start(t);
    osc.stop(t + 0.13);
    nodes.push(osc);
  }

  // bandpassed noise snap (1-8 kHz)
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1000;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 8000;
  const noiseEnv = ctx.createGain();
  noiseEnv.gain.setValueAtTime(0.7 * v, t);
  noiseEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  activeEnvs.add(noiseEnv);
  noise.connect(hp);
  hp.connect(lp);
  lp.connect(noiseEnv);
  noiseEnv.connect(output);
  noise.start(t);
  noise.stop(t + 0.2);
  nodes.push(noise, hp, lp, noiseEnv);

  attachCleanup(noise, nodes);
}

// ---- toms -----------------------------------------------------------------

function playTom(f0: number, decay: number): void {
  const { ctx, output } = getMasterBus();
  const t = ctx.currentTime;
  const v = humanize(0.8);
  const nodes: AudioNode[] = [];

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.58, t + decay * 0.8);
  const env = ctx.createGain();
  env.gain.setValueAtTime(v, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  activeEnvs.add(env);
  osc.connect(env);
  env.connect(output);
  osc.start(t);
  osc.stop(t + decay + 0.02);
  nodes.push(osc, env);

  // slight stick-attack noise
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = f0 * 8;
  bp.Q.value = 1;
  const noiseEnv = ctx.createGain();
  noiseEnv.gain.setValueAtTime(0.25 * v, t);
  noiseEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  activeEnvs.add(noiseEnv);
  noise.connect(bp);
  bp.connect(noiseEnv);
  noiseEnv.connect(output);
  noise.start(t);
  noise.stop(t + 0.05);
  nodes.push(noise, bp, noiseEnv);

  attachCleanup(osc, nodes);
}

export function tomHigh(): void {
  playTom(230, 0.4);
}

export function tomMid(): void {
  playTom(170, 0.5);
}

export function tomFloor(): void {
  playTom(115, 0.7);
}

// ---- hi-hat ---------------------------------------------------------------

let openHatEnvs: GainNode[] = [];

function playHat(open: boolean): void {
  const { ctx, output } = getMasterBus();
  const t = ctx.currentTime;
  const dur = open ? 0.45 : 0.06;
  const nodes: AudioNode[] = [];

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 10000;
  bp.Q.value = 0.7;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const env = ctx.createGain();
  env.gain.setValueAtTime(humanize(0.3), t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  activeEnvs.add(env);
  bp.connect(hp);
  hp.connect(env);
  env.connect(output);
  nodes.push(bp, hp, env);

  let last: OscillatorNode | undefined;
  for (const ratio of METAL_RATIOS) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 40 * ratio;
    osc.connect(bp);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    nodes.push(osc);
    last = osc;
  }

  if (open) openHatEnvs.push(env);
  attachCleanup(last, nodes, () => {
    openHatEnvs = openHatEnvs.filter((g) => g !== env);
  });
}

export function hihatOpen(): void {
  playHat(true);
}

export function hihatClosed(): void {
  // choke any ringing open hats before the closed tick
  const { ctx } = getMasterBus();
  const t = ctx.currentTime;
  for (const g of openHatEnvs) {
    // read the current level BEFORE cancelling: on Firefox the getter
    // recomputes from the truncated timeline after cancelScheduledValues
    const cur = Math.max(g.gain.value, 0.0001);
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(cur, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  }
  openHatEnvs = [];
  playHat(false);
}

// ---- cymbals --------------------------------------------------------------

function playCymbal(
  fundamental: number,
  dur: number,
  hpFreq: number,
  level: number,
  pingFreq: number,
): void {
  const { ctx, output } = getMasterBus();
  const t = ctx.currentTime;
  const v = humanize(level);
  const nodes: AudioNode[] = [];

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = hpFreq;
  const env = ctx.createGain();
  env.gain.setValueAtTime(v, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  activeEnvs.add(env);
  hp.connect(env);
  env.connect(output);
  nodes.push(hp, env);

  let last: OscillatorNode | undefined;
  for (const ratio of METAL_RATIOS) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = fundamental * ratio;
    osc.connect(hp);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    nodes.push(osc);
    last = osc;
  }

  // shimmering noise layer
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  noise.loop = true;
  const noiseHp = ctx.createBiquadFilter();
  noiseHp.type = "highpass";
  noiseHp.frequency.value = hpFreq + 1500;
  const noiseEnv = ctx.createGain();
  noiseEnv.gain.setValueAtTime(0.5 * v, t);
  noiseEnv.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.75);
  activeEnvs.add(noiseEnv);
  noise.connect(noiseHp);
  noiseHp.connect(noiseEnv);
  noiseEnv.connect(output);
  noise.start(t);
  noise.stop(t + dur * 0.75 + 0.05);
  nodes.push(noise, noiseHp, noiseEnv);

  // defined stick ping (ride)
  if (pingFreq > 0) {
    const ping = ctx.createOscillator();
    ping.type = "sine";
    ping.frequency.value = pingFreq;
    const pingEnv = ctx.createGain();
    pingEnv.gain.setValueAtTime(0.55 * v, t);
    pingEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    activeEnvs.add(pingEnv);
    ping.connect(pingEnv);
    pingEnv.connect(output);
    ping.start(t);
    ping.stop(t + 0.15);
    nodes.push(ping, pingEnv);
  }

  attachCleanup(last, nodes);
}

export function crash(): void {
  playCymbal(300, 1.8, 5000, 0.3, 0);
}

export function ride(): void {
  playCymbal(520, 1.2, 6000, 0.22, 1700);
}

// ---- global stop ----------------------------------------------------------

export function stopAllDrums(): void {
  const { ctx } = getMasterBus();
  const t = ctx.currentTime;
  for (const g of activeEnvs) {
    const cur = Math.max(g.gain.value, 0.0001);
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(cur, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  }
}
