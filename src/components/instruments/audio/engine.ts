// Shared Web Audio foundation for the Instrumentos screen.
// A single AudioContext feeds a master gain -> soft limiter -> destination.
// Instruments connect their voices to getMasterBus().output.

let ctx: AudioContext | null = null;
let masterOut: GainNode | null = null;

function buildGraph(): void {
  if (ctx) return;
  const AC: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  ctx = new AC({ latencyHint: "interactive" });

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 24;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  limiter.connect(ctx.destination);

  masterOut = ctx.createGain();
  masterOut.gain.value = 0.9;
  masterOut.connect(limiter);
}

export function getAudioContext(): AudioContext {
  buildGraph();
  return ctx!;
}

export function getMasterBus(): { ctx: AudioContext; output: GainNode } {
  buildGraph();
  return { ctx: ctx!, output: masterOut! };
}

// iOS/Safari suspends the context until a user gesture; call this from
// pointerdown before scheduling any sound.
export async function ensureAudioRunning(): Promise<void> {
  buildGraph();
  if (ctx!.state !== "running") {
    try {
      await ctx!.resume();
    } catch {
      // resume can reject if called outside a gesture; the next tap retries
    }
  }
}
