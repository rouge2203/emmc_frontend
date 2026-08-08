import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { ensureAudioRunning } from "./audio/engine";
import { allNotesOff, noteOff, noteOn } from "./audio/pianoSynth";

const LATIN = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const LETTER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_SEMIS = [0, 2, 4, 5, 7, 9, 11];
// black keys: semitone within octave + visual center in white-key units
const BLACK_KEYS = [
  { semi: 1, center: 0.94 },
  { semi: 3, center: 2.06 },
  { semi: 6, center: 3.94 },
  { semi: 8, center: 5.0 },
  { semi: 10, center: 6.06 },
];
const BLACK_W = 0.62; // fraction of a white key's width
// A=C4 row: index in this list = semitone offset from the keyboard base note
const KBD_CODES = [
  "KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT", "KeyG",
  "KeyY", "KeyH", "KeyU", "KeyJ", "KeyK", "KeyO", "KeyL", "KeyP",
];

const MIN_OCT = 2; // C2
const MAX_MIDI = 96; // C7
const MIN_MIDI = 36; // C2

export default function PianoKeyboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  // pointerId -> midi currently sounding for that finger (null = off the keys)
  const pointersRef = useRef<Map<number, number | null>>(new Map());
  // KeyboardEvent.code -> midi held via computer keyboard
  const kbdRef = useRef<Map<string, number>>(new Map());
  // midi -> count of active sources (fingers + keyboard keys) holding that note
  const midiCountRef = useRef<Map<number, number>>(new Map());
  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set());
  const [width, setWidth] = useState(0);
  const [octShift, setOctShift] = useState<number | null>(null); // null = auto-center
  const [useLetters, setUseLetters] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // release everything on unmount
  useEffect(() => {
    const pointers = pointersRef.current;
    const kbd = kbdRef.current;
    const counts = midiCountRef.current;
    return () => {
      pointers.clear();
      kbd.clear();
      counts.clear();
      allNotesOff();
    };
  }, []);

  const visOct = Math.min(5, Math.max(1, Math.floor((width || 400) / 200)));
  const maxOct = 7 - visOct;
  const centerOct = Math.min(maxOct, Math.max(MIN_OCT, 4 - Math.floor(visOct / 2)));
  const startOct = Math.min(maxOct, Math.max(MIN_OCT, octShift ?? centerOct));
  const startMidi = (startOct + 1) * 12;
  const endMidi = startMidi + visOct * 12;
  const totalWhites = visOct * 7 + 1;
  const unit = 100 / totalWhites;
  const kbH = Math.round(Math.min(220, Math.max(150, width * 0.24)));
  const kbdBase = Math.min(84, Math.max(MIN_MIDI, 60 + (startOct - centerOct) * 12));
  const showAllLabels = width / totalWhites >= 30;

  const names = useLetters ? LETTER : LATIN;
  const noteName = (midi: number): string =>
    `${names[midi % 12] ?? ""}${Math.floor(midi / 12) - 1}`;

  const syncPressed = (): void => {
    const s = new Set<number>();
    pointersRef.current.forEach((m) => {
      if (m !== null) s.add(m);
    });
    kbdRef.current.forEach((m) => s.add(m));
    setPressed(s);
  };

  // reference-counted note triggering: a midi note may be held by several
  // sources at once (glissando finger + held finger/keyboard key); only the
  // 0->1 transition starts the voice and only the 1->0 transition stops it
  const press = (midi: number): void => {
    const n = midiCountRef.current.get(midi) ?? 0;
    midiCountRef.current.set(midi, n + 1);
    if (n === 0) noteOn(midi);
  };

  const release = (midi: number): void => {
    const n = midiCountRef.current.get(midi) ?? 0;
    if (n <= 1) {
      midiCountRef.current.delete(midi);
      if (n === 1) noteOff(midi);
    } else {
      midiCountRef.current.set(midi, n - 1);
    }
  };

  // computer keyboard input
  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      const idx = KBD_CODES.indexOf(e.code);
      if (idx < 0 || kbdRef.current.has(e.code)) return;
      const midi = kbdBase + idx;
      if (midi < MIN_MIDI || midi > MAX_MIDI) return;
      e.preventDefault();
      void ensureAudioRunning();
      kbdRef.current.set(e.code, midi);
      press(midi);
      syncPressed();
    };
    const up = (e: KeyboardEvent): void => {
      const midi = kbdRef.current.get(e.code);
      if (midi === undefined) return;
      kbdRef.current.delete(e.code);
      release(midi);
      syncPressed();
    };
    const blur = (): void => {
      if (kbdRef.current.size === 0) return;
      kbdRef.current.forEach((m) => release(m));
      kbdRef.current.clear();
      syncPressed();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [kbdBase]);

  const midiAtPoint = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y);
    const key = el ? (el.closest("[data-midi]") as HTMLElement | null) : null;
    const v = key?.dataset.midi;
    return v === undefined ? null : Number(v);
  };

  const handleDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    void ensureAudioRunning();
    const midi = midiAtPoint(e.clientX, e.clientY);
    if (midi === null) return;
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    pointersRef.current.set(e.pointerId, midi);
    press(midi);
    syncPressed();
  };

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const map = pointersRef.current;
    const prev = map.get(e.pointerId);
    if (prev === undefined) return; // this pointer is not playing
    const midi = midiAtPoint(e.clientX, e.clientY);
    if (midi === prev) return;
    if (prev !== null) release(prev);
    map.set(e.pointerId, midi);
    if (midi !== null) press(midi);
    syncPressed();
  };

  const handleEnd = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const map = pointersRef.current;
    const prev = map.get(e.pointerId);
    if (prev === undefined) return;
    map.delete(e.pointerId);
    if (prev !== null) release(prev);
    syncPressed();
  };

  // build visible keys
  const whites: number[] = [];
  const blacks: Array<{ midi: number; center: number }> = [];
  for (let o = 0; o < visOct; o++) {
    for (const s of WHITE_SEMIS) whites.push(startMidi + o * 12 + s);
    for (const b of BLACK_KEYS)
      blacks.push({ midi: startMidi + o * 12 + b.semi, center: o * 7 + b.center });
  }
  whites.push(endMidi); // closing C

  const chipCls = (isActive: boolean): string =>
    `h-11 touch-manipulation px-4 text-xs font-medium transition-colors motion-reduce:transition-none ${
      isActive
        ? "bg-[#155c95]/25 text-[#4a9fd8]"
        : "bg-[#1a2129] text-[#8fa2b5] hover:text-[#c8d4de]"
    }`;

  return (
    <div ref={containerRef} className="w-full select-none">
      {/* controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Octava anterior"
          disabled={startOct <= MIN_OCT}
          onClick={() => setOctShift(startOct - 1)}
          className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg border border-white/5 bg-[#1a2129] text-[#9fb3c8] transition-colors hover:text-[#4a9fd8] active:bg-[#155c95]/25 disabled:opacity-35 motion-reduce:transition-none"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="min-w-24 text-center text-sm tabular-nums text-[#c8d4de]">
          {noteName(startMidi)} – {noteName(endMidi)}
        </span>
        <button
          type="button"
          aria-label="Octava siguiente"
          disabled={startOct >= maxOct}
          onClick={() => setOctShift(startOct + 1)}
          className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg border border-white/5 bg-[#1a2129] text-[#9fb3c8] transition-colors hover:text-[#4a9fd8] active:bg-[#155c95]/25 disabled:opacity-35 motion-reduce:transition-none"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
        <div
          role="group"
          aria-label="Nombres de las notas"
          className="ml-auto flex overflow-hidden rounded-full border border-white/10"
        >
          <button type="button" onClick={() => setUseLetters(false)} className={chipCls(!useLetters)}>
            Do/Re/Mi
          </button>
          <button type="button" onClick={() => setUseLetters(true)} className={chipCls(useLetters)}>
            C/D/E
          </button>
        </div>
      </div>

      {/* instrument body */}
      <div className="rounded-xl bg-[#1a2129] p-2 pt-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div
          role="group"
          aria-label="Teclado de piano"
          className="relative w-full touch-none select-none"
          style={{ height: kbH }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleEnd}
          onPointerCancel={handleEnd}
        >
          <div className="flex h-full w-full">
            {whites.map((midi) => {
              const isP = pressed.has(midi);
              const showLabel = showAllLabels || midi % 12 === 0;
              return (
                <div
                  key={midi}
                  data-midi={midi}
                  className={`relative flex-1 rounded-b-[5px] border-r border-[#b8b3a8] last:border-r-0 transition-[transform,box-shadow] duration-75 motion-reduce:transition-none ${
                    isP
                      ? "translate-y-[2px] bg-gradient-to-b from-[#dce9f4] to-[#b9d2e6] shadow-[inset_0_3px_6px_rgba(21,92,149,0.35)]"
                      : "bg-gradient-to-b from-[#f7f5f0] to-[#e8e5de] shadow-[inset_0_-5px_8px_rgba(0,0,0,0.07)]"
                  }`}
                >
                  {showLabel && (
                    <span
                      className={`pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[10px] leading-none ${
                        midi === 60 ? "font-semibold text-primary" : "text-[#8b8577]"
                      }`}
                    >
                      {noteName(midi)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {blacks.map((b) => {
            const isP = pressed.has(b.midi);
            return (
              <div
                key={b.midi}
                data-midi={b.midi}
                className={`absolute top-0 z-10 h-[60%] rounded-b-[4px] transition-transform duration-75 motion-reduce:transition-none ${
                  isP
                    ? "translate-y-[2px] bg-gradient-to-b from-[#1f5580] to-[#0e2f4c] shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.25)]"
                    : "bg-gradient-to-b from-[#34373d] via-[#17181c] to-[#0b0c0f] shadow-[0_3px_6px_rgba(0,0,0,0.55),inset_0_1px_2px_rgba(255,255,255,0.18)]"
                }`}
                style={{
                  left: `${(b.center - BLACK_W / 2) * unit}%`,
                  width: `${BLACK_W * unit}%`,
                }}
              />
            );
          })}
          {/* felt shadow along the fallboard */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-2 bg-gradient-to-b from-black/70 to-transparent" />
        </div>
      </div>

      <p className="mt-2 hidden text-xs text-[#6e7f8f] lg:block">
        Teclado del computador: A S D F G H J K tocan las teclas blancas desde{" "}
        {noteName(kbdBase)}; W E T Y U tocan las negras.
      </p>
    </div>
  );
}
