import { useEffect, useRef, useState } from "react";
import {
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { ensureAudioRunning, getMasterBus } from "./audio/engine";

const MIN_BPM = 30;
const MAX_BPM = 240;
const LOOKAHEAD = 0.12; // seconds scheduled ahead of ctx.currentTime
const TICK_MS = 25;
const SWING_DEG = 24;

type ScheduledBeat = { time: number; beat: number; n: number };
type Voice = { sources: AudioScheduledSourceNode[]; nodes: AudioNode[] };

function tempoMarking(bpm: number): string {
  if (bpm < 60) return "Largo";
  if (bpm <= 75) return "Adagio";
  if (bpm <= 107) return "Andante";
  if (bpm <= 119) return "Moderato";
  if (bpm <= 155) return "Allegro";
  if (bpm <= 199) return "Presto";
  return "Prestissimo";
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    return !["range", "checkbox", "radio", "button", "submit"].includes(type);
  }
  return false;
}

export default function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [beats, setBeats] = useState(4);
  const [running, setRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [wide, setWide] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const armRef = useRef<HTMLDivElement | null>(null);

  // Scheduler state lives in refs so interval/rAF closures never go stale.
  const bpmRef = useRef(bpm);
  const beatsRef = useRef(beats);
  const runningRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const nextBeatTimeRef = useRef(0);
  const lastScheduledTimeRef = useRef<number | null>(null);
  const beatCountRef = useRef(0); // global beat counter (pendulum parity)
  const measureIdxRef = useRef(0); // position within the measure
  const queueRef = useRef<ScheduledBeat[]>([]);
  const lastVisualNRef = useRef(-1);
  const voicesRef = useRef<Voice[]>([]);
  const noiseBufRef = useRef<AudioBuffer | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    let buf = noiseBufRef.current;
    if (!buf || buf.sampleRate !== ctx.sampleRate) {
      const len = Math.ceil(ctx.sampleRate * 0.02);
      buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      noiseBufRef.current = buf;
    }
    return buf;
  }

  // Woodblock-style click: short sine burst + 3ms filtered noise transient.
  function scheduleClick(time: number, accent: boolean) {
    const { ctx, output } = getMasterBus();

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = accent ? 1700 : 1050;
    const og = ctx.createGain();
    og.gain.setValueAtTime(accent ? 0.85 : 0.55, time);
    og.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
    osc.connect(og);
    og.connect(output);

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2500;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(accent ? 0.35 : 0.25, time);
    ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.003);
    noise.connect(hp);
    hp.connect(ng);
    ng.connect(output);

    osc.start(time);
    osc.stop(time + 0.06);
    noise.start(time);
    noise.stop(time + 0.012);

    const voice: Voice = { sources: [osc, noise], nodes: [og, hp, ng] };
    voicesRef.current.push(voice);
    osc.onended = () => {
      voicesRef.current = voicesRef.current.filter((v) => v !== voice);
      for (const node of voice.nodes) node.disconnect();
    };
  }

  function stopAllVoices() {
    for (const voice of voicesRef.current) {
      for (const src of voice.sources) {
        src.onended = null;
        try {
          src.stop();
        } catch {
          // already stopped
        }
      }
      for (const node of voice.nodes) {
        try {
          node.disconnect();
        } catch {
          // already disconnected
        }
      }
    }
    voicesRef.current = [];
  }

  // Lookahead scheduler: runs every ~25ms, schedules clicks with exact
  // AudioContext timestamps up to LOOKAHEAD seconds ahead.
  function schedulerTick() {
    const { ctx } = getMasterBus();
    while (nextBeatTimeRef.current < ctx.currentTime + LOOKAHEAD) {
      const t = nextBeatTimeRef.current;
      const beatsNow = beatsRef.current;
      const beat = measureIdxRef.current;
      scheduleClick(t, beatsNow > 1 && beat === 0);
      queueRef.current.push({ time: t, beat, n: beatCountRef.current });
      lastScheduledTimeRef.current = t;
      beatCountRef.current += 1;
      measureIdxRef.current = (beat + 1) % beatsNow;
      nextBeatTimeRef.current = t + 60 / bpmRef.current;
    }
  }

  function start() {
    if (runningRef.current) return;
    void ensureAudioRunning();
    const { ctx } = getMasterBus();
    queueRef.current = [];
    beatCountRef.current = 0;
    measureIdxRef.current = 0;
    lastVisualNRef.current = -1;
    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    lastScheduledTimeRef.current = null;
    runningRef.current = true;
    setRunning(true);
    if (armRef.current) armRef.current.style.transform = `rotate(${SWING_DEG}deg)`;
    schedulerTick();
    intervalRef.current = window.setInterval(schedulerTick, TICK_MS);
  }

  function stop() {
    if (!runningRef.current) return;
    runningRef.current = false;
    setRunning(false);
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopAllVoices();
    queueRef.current = [];
    lastScheduledTimeRef.current = null;
    setCurrentBeat(-1);
    if (armRef.current) armRef.current.style.transform = "rotate(0deg)";
  }

  function toggle() {
    if (runningRef.current) stop();
    else start();
  }

  // BPM changed: keep the already-scheduled beat, re-time from the next one.
  useEffect(() => {
    bpmRef.current = bpm;
    if (!runningRef.current || lastScheduledTimeRef.current === null) return;
    const { ctx } = getMasterBus();
    nextBeatTimeRef.current = Math.max(
      lastScheduledTimeRef.current + 60 / bpm,
      ctx.currentTime + 0.02,
    );
  }, [bpm]);

  useEffect(() => {
    beatsRef.current = beats;
    measureIdxRef.current = measureIdxRef.current % beats;
  }, [beats]);

  // Visuals derive from the scheduled-beats queue read against audio time.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const step = () => {
      const { ctx } = getMasterBus();
      const now = ctx.currentTime;
      const q = queueRef.current;
      while (q.length > 1) {
        const next = q[1];
        if (!next || next.time > now) break;
        q.shift();
      }
      const cur = q[0];
      if (cur && cur.time <= now) {
        if (cur.n !== lastVisualNRef.current) {
          lastVisualNRef.current = cur.n;
          setCurrentBeat(cur.beat);
        }
        const next = q[1];
        const nextTime = next ? next.time : cur.time + 60 / bpmRef.current;
        const span = Math.max(nextTime - cur.time, 0.001);
        const p = Math.min(Math.max((now - cur.time) / span, 0), 1);
        const dir = cur.n % 2 === 0 ? 1 : -1;
        const deg = SWING_DEG * Math.cos(Math.PI * p) * dir;
        if (armRef.current) armRef.current.style.transform = `rotate(${deg}deg)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // Space toggles start/stop (ignored while typing in a text field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest(
          'button, a, input, select, textarea, [role="tab"], [contenteditable]',
        )
      )
        return;
      e.preventDefault();
      void ensureAudioRunning();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unmount cleanup.
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      stopAllVoices();
    };
  }, []);

  // Layout switches on container width, not viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setWide(w >= 700);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function onTap() {
    void ensureAudioRunning();
    const now = performance.now();
    const taps = tapTimesRef.current;
    const last = taps.length > 0 ? (taps[taps.length - 1] ?? 0) : null;
    if (last !== null && now - last > 2000) taps.length = 0; // reset after 2s idle
    taps.push(now);
    if (taps.length > 5) taps.shift(); // keep at most 4 intervals
    if (taps.length >= 2) {
      let sum = 0;
      for (let i = 1; i < taps.length; i++) sum += (taps[i] ?? 0) - (taps[i - 1] ?? 0);
      const avg = sum / (taps.length - 1);
      setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(60000 / avg))));
    }
  }

  const nudgeBpm = (delta: number) =>
    setBpm((b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + delta)));

  const chipBase =
    "h-11 w-11 rounded-lg border text-sm font-medium tabular-nums touch-none transition-colors";
  const roundBtn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#2a3542] bg-[#1a2129] text-gray-300 touch-none transition-colors hover:border-[#3a566e] hover:text-white disabled:pointer-events-none disabled:opacity-40";

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="w-full select-none py-2 text-gray-200 short:py-0"
    >
      <div
        className={
          wide
            ? "flex flex-row items-center gap-10 short:gap-3"
            : "flex flex-col items-center gap-6 short:gap-3"
        }
      >
        {/* Pendulum + beat dots */}
        <div
          className={`flex flex-col items-center gap-5 short:gap-2 ${wide ? "w-[38%]" : "w-full"}`}
        >
          <div
            className={`relative w-full max-w-xs motion-reduce:hidden short:h-28 ${wide ? "h-52" : "h-40"}`}
          >
            <div className="absolute inset-x-0 bottom-2 mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-[#2a3542] to-transparent" />
            <div
              ref={armRef}
              className="absolute bottom-4 left-1/2 -ml-[1.5px] h-[85%] w-[3px] origin-bottom rounded-full bg-gradient-to-t from-[#2a3542] via-[#3a566e] to-[#4a9fd8]/80 will-change-transform"
            >
              <div
                className={`absolute -left-[8.5px] top-[6%] h-5 w-5 rounded-full transition-colors ${
                  running
                    ? "bg-[#4a9fd8] shadow-[0_0_14px_rgba(74,159,216,0.5)]"
                    : "bg-[#3a566e]"
                }`}
              />
            </div>
            <div className="absolute bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-[#2a3542] bg-[#1a2129]" />
          </div>

          <div className="flex items-center justify-center gap-3" aria-hidden="true">
            {Array.from({ length: beats }, (_, i) => {
              const active = running && i === currentBeat;
              const isAccent = beats > 1 && i === 0;
              const color =
                isAccent && active
                  ? "bg-[#4a9fd8] ring-2 ring-[#4a9fd8]/35"
                  : active
                    ? "bg-white"
                    : "bg-gray-600";
              return (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-colors duration-75 ${color}`}
                />
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div
          className={`flex flex-col items-center gap-5 short:gap-2 ${wide ? "min-w-0 flex-1" : "w-full"}`}
        >
          <div className="text-center">
            <div className="text-6xl font-extralight leading-none tracking-tight text-white tabular-nums lg:text-7xl short:text-4xl">
              {bpm}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-gray-500 short:mt-0.5">
              bpm
            </div>
            <div className="mt-1.5 font-serif text-lg italic text-[#4a9fd8] short:hidden">
              {tempoMarking(bpm)}
            </div>
          </div>

          <div className="flex w-full max-w-md items-center gap-3">
            <button
              type="button"
              aria-label="Bajar tempo"
              disabled={bpm <= MIN_BPM}
              onClick={() => nudgeBpm(-1)}
              className={roundBtn}
            >
              <MinusIcon className="h-5 w-5" />
            </button>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              step={1}
              value={bpm}
              aria-label="Tempo"
              onChange={(e) => setBpm(Number(e.target.value))}
              className="h-11 w-full min-w-0 flex-1 cursor-pointer accent-primary"
            />
            <button
              type="button"
              aria-label="Subir tempo"
              disabled={bpm >= MAX_BPM}
              onClick={() => nudgeBpm(1)}
              className={roundBtn}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2 short:gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
              Pulsos por compás
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={beats === n}
                  onClick={() => setBeats(n)}
                  className={`${chipBase} ${
                    beats === n
                      ? "border-primary bg-primary text-white"
                      : "border-[#2a3542] bg-[#1a2129] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                onTap();
              }}
              onClick={(e) => {
                if (e.detail === 0) onTap();
              }}
              className="h-11 w-20 rounded-full border border-[#2a3542] bg-[#1a2129] text-sm text-gray-300 touch-none transition-colors hover:border-[#3a566e] hover:text-white active:border-[#4a9fd8] active:text-[#4a9fd8]"
            >
              Tap
            </button>
            <button
              type="button"
              aria-label={running ? "Detener" : "Iniciar"}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                e.preventDefault();
                void ensureAudioRunning();
                toggle();
              }}
              onClick={(e) => {
                if (e.detail === 0) toggle();
              }}
              className={`flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white touch-none transition-all hover:bg-[#19699c] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                running ? "shadow-[0_0_28px_rgba(74,159,216,0.35)]" : ""
              }`}
            >
              {running ? (
                <PauseIcon className="h-7 w-7" />
              ) : (
                <PlayIcon className="ml-0.5 h-7 w-7" />
              )}
            </button>
            <div className="w-20" aria-hidden="true" />
          </div>

          <p className="hidden text-center text-[11px] text-gray-500 md:block short:hidden">
            Espacio para iniciar o detener
          </p>
        </div>
      </div>
    </div>
  );
}
