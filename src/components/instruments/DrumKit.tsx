import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ensureAudioRunning } from "./audio/engine";
import {
  kick,
  snare,
  hihatClosed,
  hihatOpen,
  tomHigh,
  tomMid,
  tomFloor,
  crash,
  ride,
  stopAllDrums,
} from "./audio/drumSynth";

type PieceId =
  | "kick"
  | "snare"
  | "hhClosed"
  | "hhOpen"
  | "tom1"
  | "tom2"
  | "tomFloor"
  | "crash"
  | "ride";

type LayoutMode = "desktop" | "portrait" | "landscape";

type CymbalLayout = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  standX: number;
  standY: number;
};

type DrumLayout = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  depth: number;
  rotation: number;
};

type KickLayout = {
  x: number;
  y: number;
  rx: number;
  ry: number;
};

type KitLayout = {
  width: number;
  height: number;
  crash: CymbalLayout;
  ride: CymbalLayout;
  hihat: CymbalLayout;
  tom1: DrumLayout;
  tom2: DrumLayout;
  snare: DrumLayout;
  floorTom: DrumLayout;
  kick: KickLayout;
};

const SOUNDS: Record<PieceId, () => void> = {
  kick,
  snare,
  hhClosed: hihatClosed,
  hhOpen: hihatOpen,
  tom1: tomHigh,
  tom2: tomMid,
  tomFloor,
  crash,
  ride,
};

const PIECE_META: Record<PieceId, { name: string; key: string; code: string }> = {
  kick: { name: "Bombo", key: "Z", code: "KeyZ" },
  snare: { name: "Caja", key: "X", code: "KeyX" },
  hhClosed: { name: "Charles cerrado", key: "C", code: "KeyC" },
  hhOpen: { name: "Charles abierto", key: "V", code: "KeyV" },
  tom1: { name: "Tom agudo", key: "B", code: "KeyB" },
  tom2: { name: "Tom medio", key: "N", code: "KeyN" },
  tomFloor: { name: "Tom de piso", key: "M", code: "KeyM" },
  crash: { name: "Platillo crash", key: "J", code: "KeyJ" },
  ride: { name: "Platillo ride", key: "K", code: "KeyK" },
};

const CODEMAP = Object.fromEntries(
  Object.entries(PIECE_META).map(([id, meta]) => [meta.code, id]),
) as Record<string, PieceId>;

const KEY_HINTS: ReadonlyArray<PieceId> = [
  "kick",
  "snare",
  "hhClosed",
  "hhOpen",
  "tom1",
  "tom2",
  "tomFloor",
  "crash",
  "ride",
];

const INITIAL_HITS: Record<PieceId, number> = {
  kick: 0,
  snare: 0,
  hhClosed: 0,
  hhOpen: 0,
  tom1: 0,
  tom2: 0,
  tomFloor: 0,
  crash: 0,
  ride: 0,
};

const LAYOUTS: Record<LayoutMode, KitLayout> = {
  desktop: {
    width: 1000,
    height: 610,
    crash: { x: 112, y: 102, rx: 184, ry: 57, rotation: -7, standX: 156, standY: 344 },
    ride: { x: 888, y: 108, rx: 194, ry: 61, rotation: 7, standX: 842, standY: 357 },
    hihat: { x: 112, y: 342, rx: 116, ry: 36, rotation: -4, standX: 126, standY: 575 },
    tom1: { x: 382, y: 220, rx: 94, ry: 57, depth: 82, rotation: -5 },
    tom2: { x: 578, y: 216, rx: 102, ry: 61, depth: 90, rotation: 5 },
    snare: { x: 258, y: 422, rx: 122, ry: 70, depth: 94, rotation: -4 },
    floorTom: { x: 790, y: 408, rx: 134, ry: 76, depth: 106, rotation: 4 },
    kick: { x: 505, y: 456, rx: 160, ry: 143 },
  },
  portrait: {
    width: 700,
    height: 780,
    crash: { x: 58, y: 88, rx: 148, ry: 45, rotation: -7, standX: 94, standY: 350 },
    ride: { x: 646, y: 96, rx: 154, ry: 47, rotation: 7, standX: 612, standY: 360 },
    hihat: { x: 88, y: 396, rx: 114, ry: 35, rotation: -4, standX: 104, standY: 698 },
    tom1: { x: 253, y: 232, rx: 82, ry: 48, depth: 74, rotation: -5 },
    tom2: { x: 448, y: 228, rx: 88, ry: 51, depth: 78, rotation: 5 },
    snare: { x: 205, y: 506, rx: 112, ry: 62, depth: 86, rotation: -4 },
    floorTom: { x: 548, y: 496, rx: 120, ry: 66, depth: 96, rotation: 4 },
    kick: { x: 356, y: 632, rx: 136, ry: 128 },
  },
  landscape: {
    width: 1080,
    height: 450,
    crash: { x: 88, y: 58, rx: 184, ry: 47, rotation: -7, standX: 142, standY: 282 },
    ride: { x: 1000, y: 62, rx: 194, ry: 50, rotation: 7, standX: 942, standY: 290 },
    hihat: { x: 112, y: 259, rx: 118, ry: 32, rotation: -4, standX: 132, standY: 432 },
    tom1: { x: 420, y: 144, rx: 94, ry: 51, depth: 68, rotation: -5 },
    tom2: { x: 625, y: 142, rx: 101, ry: 54, depth: 72, rotation: 5 },
    snare: { x: 292, y: 309, rx: 120, ry: 58, depth: 78, rotation: -4 },
    floorTom: { x: 825, y: 300, rx: 130, ry: 62, depth: 78, rotation: 4 },
    kick: { x: 535, y: 337, rx: 148, ry: 111 },
  },
};

function chooseLayoutMode(): LayoutMode {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(orientation: portrait)").matches && window.innerWidth < 900) {
    return "portrait";
  }
  if (window.matchMedia("(orientation: landscape)").matches && window.innerHeight <= 620) {
    return "landscape";
  }
  return "desktop";
}

function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(chooseLayoutMode);

  useEffect(() => {
    const update = () => setMode(chooseLayoutMode());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    update();
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return mode;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

type PieceControlProps = {
  id: PieceId;
  onTrigger: (id: PieceId) => void;
  children: ReactNode;
  className?: string;
};

function PieceControl({ id, onTrigger, children, className = "" }: PieceControlProps) {
  const meta = PIECE_META[id];

  const handlePointerDown = (event: ReactPointerEvent<SVGGElement>): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    onTrigger(id);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<SVGGElement>): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onTrigger(id);
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${meta.name}. Tecla ${meta.key}`}
      aria-keyshortcuts={meta.key}
      className={`dk-piece ${className}`}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      <title>{`${meta.name} — tecla ${meta.key}`}</title>
      {children}
    </g>
  );
}

function Stand({ topX, topY, baseX, baseY, compact = false }: {
  topX: number;
  topY: number;
  baseX: number;
  baseY: number;
  compact?: boolean;
}) {
  const spread = compact ? 34 : 48;
  const clampY = baseY - 74;
  const clampProgress = (clampY - topY) / Math.max(baseY - topY, 1);
  const clampX = topX + (baseX - topX) * clampProgress;
  const shaftAngle = (Math.atan2(baseY - topY, baseX - topX) * 180) / Math.PI - 90;
  return (
    <g className="dk-hardware" aria-hidden="true" pointerEvents="none">
      <line x1={topX + 3} y1={topY} x2={baseX + 5} y2={baseY} stroke="#05070a" strokeWidth={9} opacity={0.7} />
      <line x1={topX} y1={topY} x2={baseX} y2={baseY} stroke="url(#dkChrome)" strokeWidth={5} />
      <line x1={topX - 0.8} y1={topY} x2={baseX - 0.8} y2={baseY} stroke="#f6fbff" strokeWidth={1.2} opacity={0.72} />
      <rect
        x={clampX - 7}
        y={clampY - 3}
        width={14}
        height={6}
        rx={2.5}
        fill="#343b42"
        stroke="#aeb7bf"
        strokeWidth={1.5}
        transform={`rotate(${shaftAngle} ${clampX} ${clampY})`}
      />
      <path d={`M ${baseX} ${baseY - 10} L ${baseX - spread} ${baseY + 12}`} stroke="#858e96" strokeWidth={5} strokeLinecap="round" />
      <path d={`M ${baseX} ${baseY - 10} L ${baseX + spread} ${baseY + 12}`} stroke="#858e96" strokeWidth={5} strokeLinecap="round" />
      <path d={`M ${baseX} ${baseY - 10} L ${baseX + spread * 0.45} ${baseY + 22}`} stroke="#4c545b" strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

function Cymbal({
  id,
  layout,
  hit,
  onTrigger,
  kind,
}: {
  id: "crash" | "ride";
  layout: CymbalLayout;
  hit: number;
  onTrigger: (id: PieceId) => void;
  kind: "crash" | "ride";
}) {
  const { x, y, rx, ry, rotation } = layout;
  const rings = kind === "ride" ? [0.88, 0.76, 0.64, 0.51, 0.39, 0.28] : [0.86, 0.7, 0.55, 0.4];
  return (
    <PieceControl id={id} onTrigger={onTrigger}>
      <g transform={`rotate(${rotation} ${x} ${y})`}>
        <g key={hit} className={hit > 0 ? "dk-anim-cymbal" : undefined}>
          <ellipse cx={x} cy={y + 7} rx={rx} ry={ry} fill="#73511e" opacity={0.9} />
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="url(#dkCymbal)" stroke="#76551e" strokeWidth={2.5} />
          <ellipse cx={x - rx * 0.25} cy={y - ry * 0.24} rx={rx * 0.62} ry={ry * 0.32} fill="url(#dkCymbalGlint)" opacity={0.72} />
          {rings.map((scale, index) => (
            <ellipse
              key={scale}
              cx={x}
              cy={y}
              rx={rx * scale}
              ry={ry * scale}
              fill="none"
              stroke={index % 2 === 0 ? "#6d4b17" : "#fff2b8"}
              strokeOpacity={index % 2 === 0 ? 0.38 : 0.24}
              strokeWidth={1.2}
            />
          ))}
          <ellipse cx={x} cy={y - 1} rx={rx * 0.17} ry={Math.max(8, ry * 0.34)} fill="url(#dkCymbalBell)" stroke="#76551e" strokeWidth={1.5} />
          <ellipse cx={x} cy={y - 3} rx={5} ry={3.2} fill="#302411" />
          <rect x={x - 2.4} y={y - 18} width={4.8} height={16} rx={2} fill="#c7cbd0" />
          <ellipse cx={x} cy={y - 18} rx={8} ry={3.5} fill="#25292e" stroke="#c5c9cd" strokeWidth={1.5} />
          {hit > 0 && <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff5c9" className="dk-flash" />}
        </g>
        <ellipse cx={x} cy={y} rx={rx + 7} ry={ry + 10} fill="transparent" pointerEvents="all" />
      </g>
    </PieceControl>
  );
}

function shellSidePath({ x, y, rx, ry, depth }: DrumLayout): string {
  const bottom = y + depth;
  return [
    `M ${x - rx} ${y}`,
    `C ${x - rx} ${y + depth * 0.42}, ${x - rx * 0.92} ${y + depth * 0.86}, ${x - rx * 0.78} ${bottom}`,
    `C ${x - rx * 0.38} ${bottom + ry * 0.28}, ${x + rx * 0.38} ${bottom + ry * 0.28}, ${x + rx * 0.78} ${bottom}`,
    `C ${x + rx * 0.92} ${y + depth * 0.86}, ${x + rx} ${y + depth * 0.42}, ${x + rx} ${y}`,
    "Z",
  ].join(" ");
}

function Drum({
  id,
  layout,
  hit,
  onTrigger,
  finish = "wood",
}: {
  id: "tom1" | "tom2" | "tomFloor" | "snare";
  layout: DrumLayout;
  hit: number;
  onTrigger: (id: PieceId) => void;
  finish?: "wood" | "metal";
}) {
  const { x, y, rx, ry, depth, rotation } = layout;
  const shellPath = shellSidePath(layout);
  const lugFractions = [-0.76, -0.4, 0, 0.4, 0.76];
  const lowerY = y + depth;

  return (
    <PieceControl id={id} onTrigger={onTrigger}>
      <g transform={`rotate(${rotation} ${x} ${y})`}>
        <path d={shellPath} fill="#05070a" opacity={0.64} transform="translate(7 9)" />
        <path d={shellPath} fill={finish === "wood" ? "url(#dkWoodShell)" : "url(#dkSnareShell)"} stroke="#332116" strokeWidth={2.2} />
        {finish === "wood" && <path d={shellPath} fill="url(#dkWoodGrain)" opacity={0.42} />}
        <path
          d={`M ${x - rx * 0.78} ${lowerY} Q ${x} ${lowerY + ry * 0.3} ${x + rx * 0.78} ${lowerY}`}
          fill="none"
          stroke="#20262b"
          strokeWidth={10}
          opacity={0.76}
        />
        <path
          d={`M ${x - rx * 0.78} ${lowerY - 1} Q ${x} ${lowerY + ry * 0.25} ${x + rx * 0.78} ${lowerY - 1}`}
          fill="none"
          stroke="url(#dkChrome)"
          strokeWidth={5}
        />
        {lugFractions.map((fraction) => {
          const topY = y + ry * Math.sqrt(1 - fraction * fraction) * 0.82;
          const bottomX = x + rx * fraction * 0.8;
          return (
            <g key={fraction} className="dk-lug">
              <line x1={x + rx * fraction} y1={topY + 4} x2={bottomX} y2={lowerY - 2} stroke="#d8dde1" strokeWidth={3.2} />
              <line x1={x + rx * fraction - 1} y1={topY + 4} x2={bottomX - 1} y2={lowerY - 2} stroke="#66717a" strokeWidth={1} />
              <rect x={x + rx * fraction - 6} y={topY - 2} width={12} height={13} rx={3} fill="url(#dkChrome)" stroke="#505860" strokeWidth={1} />
              <rect x={bottomX - 6} y={lowerY - 9} width={12} height={13} rx={3} fill="url(#dkChrome)" stroke="#505860" strokeWidth={1} />
            </g>
          );
        })}
        <g key={hit} className={hit > 0 ? "dk-anim-head" : undefined}>
          <ellipse cx={x} cy={y + 3} rx={rx + 7} ry={ry + 5} fill="#8a9299" stroke="#e1e5e8" strokeWidth={3} />
          <ellipse cx={x} cy={y} rx={rx + 4} ry={ry + 3} fill="none" stroke="url(#dkChrome)" strokeWidth={7} />
          <ellipse cx={x} cy={y} rx={rx - 2} ry={ry - 2} fill={finish === "metal" ? "url(#dkSnareHead)" : "url(#dkDrumHead)"} stroke="#9da5aa" strokeWidth={2} />
          <ellipse cx={x} cy={y} rx={rx * 0.84} ry={ry * 0.82} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={1.4} />
          <ellipse cx={x + rx * 0.05} cy={y + ry * 0.08} rx={rx * 0.25} ry={ry * 0.18} fill="#7b746b" opacity={0.08} />
          <path d={`M ${x - rx * 0.62} ${y - ry * 0.35} Q ${x} ${y - ry * 0.72} ${x + rx * 0.62} ${y - ry * 0.35}`} fill="none" stroke="#fff" strokeOpacity={0.22} strokeWidth={2} />
          {hit > 0 && <ellipse cx={x} cy={y} rx={rx - 2} ry={ry - 2} fill="#ffffff" className="dk-flash" />}
        </g>
        <rect
          x={x - rx}
          y={y - ry - 8}
          width={rx * 2}
          height={ry + depth + ry * 0.42 + 16}
          rx={24}
          fill="transparent"
          pointerEvents="all"
        />
      </g>
    </PieceControl>
  );
}

function KickDrum({ layout, hit, onTrigger }: {
  layout: KickLayout;
  hit: number;
  onTrigger: (id: PieceId) => void;
}) {
  const { x, y, rx, ry } = layout;
  const lugs = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
    const lx = x + Math.cos(angle) * (rx - 9);
    const ly = y + Math.sin(angle) * (ry - 9);
    return (
      <g key={index} transform={`rotate(${(angle * 180) / Math.PI + 90} ${lx} ${ly})`}>
        <rect x={lx - 7} y={ly - 5} width={14} height={10} rx={3} fill="url(#dkChrome)" stroke="#3d454d" strokeWidth={1.2} />
        <line x1={lx} y1={ly - 7} x2={lx} y2={ly - 17} stroke="#dce1e4" strokeWidth={2.5} />
      </g>
    );
  });

  return (
    <PieceControl id="kick" onTrigger={onTrigger}>
      <g>
        <ellipse cx={x + 7} cy={y + 10} rx={rx + 13} ry={ry + 13} fill="#020305" opacity={0.7} />
        <ellipse cx={x} cy={y} rx={rx + 13} ry={ry + 13} fill="url(#dkWoodShell)" stroke="#321d12" strokeWidth={3} />
        <ellipse cx={x} cy={y} rx={rx + 6} ry={ry + 7} fill="none" stroke="url(#dkChrome)" strokeWidth={8} />
        {lugs}
        <g key={hit} className={hit > 0 ? "dk-anim-kick" : undefined}>
          <ellipse cx={x} cy={y} rx={rx - 3} ry={ry - 3} fill="url(#dkKickHead)" stroke="#111820" strokeWidth={3} />
          <ellipse cx={x} cy={y} rx={rx * 0.71} ry={ry * 0.71} fill="none" stroke="#91a2af" strokeOpacity={0.2} strokeWidth={2} />
          <ellipse cx={x} cy={y + ry * 0.53} rx={rx * 0.2} ry={ry * 0.16} fill="#070b0f" stroke="#49545d" strokeWidth={2} />
          <g transform={`translate(${x} ${y - 3})`} opacity={0.66} aria-hidden="true">
            <path d="M -49 -8 Q 0 -39 49 -8 L 42 31 Q 0 48 -42 31 Z" fill="none" stroke="#b9c5ce" strokeWidth={3} />
            <text x={0} y={20} textAnchor="middle" fill="#d5dde3" fontSize={27} fontWeight={800} letterSpacing={2}>
              EMMC
            </text>
          </g>
          {hit > 0 && <ellipse cx={x} cy={y} rx={rx - 3} ry={ry - 3} fill="#62b4e8" className="dk-flash" />}
        </g>
        <ellipse cx={x} cy={y} rx={rx + 8} ry={ry + 8} fill="transparent" pointerEvents="all" />
      </g>
    </PieceControl>
  );
}

function HiHat({ layout, closedHit, openHit, onTrigger }: {
  layout: CymbalLayout;
  closedHit: number;
  openHit: number;
  onTrigger: (id: PieceId) => void;
}) {
  const { x, y, rx, ry, rotation } = layout;
  const lastHit = Math.max(closedHit, openHit);
  const targetHeight = Math.max(112, ry * 3.1);
  return (
    <g transform={`rotate(${rotation} ${x} ${y})`}>
      <g key={`${closedHit}-${openHit}`} className={lastHit > 0 ? "dk-anim-cymbal" : undefined} aria-hidden="true">
        <ellipse cx={x + 2} cy={y + 8} rx={rx - 3} ry={ry} fill="#75511d" stroke="#3f2d13" strokeWidth={2} />
        <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="url(#dkCymbal)" stroke="#76551e" strokeWidth={2.5} />
        {[0.8, 0.61, 0.42].map((scale) => (
          <ellipse key={scale} cx={x} cy={y} rx={rx * scale} ry={ry * scale} fill="none" stroke="#6c4c18" strokeOpacity={0.38} strokeWidth={1.2} />
        ))}
        <ellipse cx={x} cy={y - 1} rx={rx * 0.14} ry={ry * 0.36} fill="url(#dkCymbalBell)" />
        <rect x={x - 2} y={y - 20} width={4} height={19} rx={2} fill="#cbd0d4" />
        <ellipse cx={x} cy={y - 20} rx={7} ry={3} fill="#272c31" stroke="#c5c9cd" strokeWidth={1.2} />
        {lastHit > 0 && <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff4c4" className="dk-flash" />}
      </g>
      <PieceControl id="hhClosed" onTrigger={onTrigger} className="dk-hihat-zone">
        <rect
          x={x - rx - 5}
          y={y - targetHeight / 2}
          width={rx + 5}
          height={targetHeight}
          rx={18}
          fill="transparent"
          pointerEvents="all"
        />
      </PieceControl>
      <PieceControl id="hhOpen" onTrigger={onTrigger} className="dk-hihat-zone">
        <rect
          x={x}
          y={y - targetHeight / 2}
          width={rx + 5}
          height={targetHeight}
          rx={18}
          fill="transparent"
          pointerEvents="all"
        />
      </PieceControl>
    </g>
  );
}

function StageBackground({ width, height }: { width: number; height: number }) {
  return (
    <g aria-hidden="true" pointerEvents="none">
      <rect width={width} height={height} fill="url(#dkStudio)" />
      <ellipse cx={width * 0.5} cy={height * 0.1} rx={width * 0.44} ry={height * 0.48} fill="url(#dkSpotlight)" opacity={0.54} />
      <path d={`M 0 ${height * 0.53} Q ${width * 0.5} ${height * 0.45} ${width} ${height * 0.53} L ${width} ${height} L 0 ${height} Z`} fill="url(#dkFloor)" />
      {[0.61, 0.7, 0.79, 0.88].map((fraction) => (
        <path
          key={fraction}
          d={`M 0 ${height * fraction} Q ${width * 0.5} ${height * (fraction - 0.025)} ${width} ${height * fraction}`}
          fill="none"
          stroke="#90a0ad"
          strokeOpacity={0.045}
          strokeWidth={2}
        />
      ))}
      <ellipse cx={width * 0.5} cy={height * 0.76} rx={width * 0.43} ry={height * 0.27} fill="#020304" opacity={0.3} filter="url(#dkSoftShadow)" />
      <rect x={1.5} y={1.5} width={width - 3} height={height - 3} rx={26} fill="none" stroke="#ffffff" strokeOpacity={0.075} strokeWidth={3} />
    </g>
  );
}

function DrumHardware({ layout, mode }: { layout: KitLayout; mode: LayoutMode }) {
  const compact = mode !== "desktop";
  const { kick: k, tom1, tom2, floorTom, hihat } = layout;
  return (
    <g aria-hidden="true" pointerEvents="none">
      <Stand topX={layout.crash.x} topY={layout.crash.y + 4} baseX={layout.crash.standX} baseY={layout.crash.standY} compact={compact} />
      <Stand topX={layout.ride.x} topY={layout.ride.y + 4} baseX={layout.ride.standX} baseY={layout.ride.standY} compact={compact} />
      <Stand topX={hihat.x} topY={hihat.y + 4} baseX={hihat.standX} baseY={hihat.standY} compact={compact} />

      <path d={`M ${k.x - k.rx * 0.77} ${k.y + k.ry * 0.62} L ${k.x - k.rx * 1.07} ${k.y + k.ry * 0.94}`} stroke="#9ba4ab" strokeWidth={7} strokeLinecap="round" />
      <path d={`M ${k.x + k.rx * 0.77} ${k.y + k.ry * 0.62} L ${k.x + k.rx * 1.07} ${k.y + k.ry * 0.94}`} stroke="#9ba4ab" strokeWidth={7} strokeLinecap="round" />
      <path d={`M ${floorTom.x - floorTom.rx * 0.65} ${floorTom.y + floorTom.depth * 0.55} L ${floorTom.x - floorTom.rx * 0.88} ${floorTom.y + floorTom.depth * 1.35}`} stroke="#aab2b8" strokeWidth={6} strokeLinecap="round" />
      <path d={`M ${floorTom.x + floorTom.rx * 0.56} ${floorTom.y + floorTom.depth * 0.55} L ${floorTom.x + floorTom.rx * 0.79} ${floorTom.y + floorTom.depth * 1.35}`} stroke="#aab2b8" strokeWidth={6} strokeLinecap="round" />

      <path d={`M ${k.x} ${k.y - k.ry * 0.84} L ${k.x} ${k.y - k.ry * 1.33}`} stroke="url(#dkChrome)" strokeWidth={11} strokeLinecap="round" />
      <path d={`M ${k.x} ${k.y - k.ry * 1.16} Q ${k.x - 15} ${k.y - k.ry * 1.38} ${tom1.x + tom1.rx * 0.46} ${tom1.y + tom1.depth * 0.3}`} fill="none" stroke="url(#dkChrome)" strokeWidth={8} strokeLinecap="round" />
      <path d={`M ${k.x} ${k.y - k.ry * 1.16} Q ${k.x + 15} ${k.y - k.ry * 1.38} ${tom2.x - tom2.rx * 0.46} ${tom2.y + tom2.depth * 0.3}`} fill="none" stroke="url(#dkChrome)" strokeWidth={8} strokeLinecap="round" />
      <rect x={k.x - 19} y={k.y - k.ry * 1.26} width={38} height={25} rx={7} fill="#3f474e" stroke="#c2c9ce" strokeWidth={3} />

      <g transform={`translate(${k.x} ${k.y + k.ry * 0.92})`}>
        <path d="M -17 -3 L -28 36 Q 0 50 28 36 L 17 -3 Z" fill="#4e555b" stroke="#b5bcc1" strokeWidth={3} />
        <path d="M -13 7 L 13 7 M -16 16 L 16 16 M -19 25 L 19 25" stroke="#252a2e" strokeWidth={3} />
        <line x1={0} y1={0} x2={0} y2={-48} stroke="#aeb6bc" strokeWidth={5} />
        <ellipse cx={0} cy={-51} rx={13} ry={8} fill="#e8e1d5" stroke="#6e7479" strokeWidth={2} />
      </g>
    </g>
  );
}

function SvgDefs() {
  return (
    <defs>
      <linearGradient id="dkChrome" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#525b63" />
        <stop offset="18%" stopColor="#f1f4f6" />
        <stop offset="42%" stopColor="#7d878f" />
        <stop offset="68%" stopColor="#e8ecef" />
        <stop offset="100%" stopColor="#4d555c" />
      </linearGradient>
      <linearGradient id="dkWoodShell" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#32150e" />
        <stop offset="16%" stopColor="#73321e" />
        <stop offset="42%" stopColor="#b45c2d" />
        <stop offset="62%" stopColor="#6d2a18" />
        <stop offset="86%" stopColor="#a84e27" />
        <stop offset="100%" stopColor="#2a120c" />
      </linearGradient>
      <linearGradient id="dkSnareShell" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#394149" />
        <stop offset="13%" stopColor="#d8dde0" />
        <stop offset="32%" stopColor="#636e76" />
        <stop offset="51%" stopColor="#eef1f3" />
        <stop offset="73%" stopColor="#717b83" />
        <stop offset="100%" stopColor="#30373d" />
      </linearGradient>
      <radialGradient id="dkDrumHead" cx="38%" cy="31%" r="78%">
        <stop offset="0%" stopColor="#eee9df" />
        <stop offset="54%" stopColor="#d7d0c4" />
        <stop offset="84%" stopColor="#9c9488" />
        <stop offset="100%" stopColor="#68645f" />
      </radialGradient>
      <radialGradient id="dkSnareHead" cx="36%" cy="28%" r="78%">
        <stop offset="0%" stopColor="#f6f6f3" />
        <stop offset="62%" stopColor="#d9d9d4" />
        <stop offset="100%" stopColor="#8e9292" />
      </radialGradient>
      <radialGradient id="dkKickHead" cx="43%" cy="38%" r="72%">
        <stop offset="0%" stopColor="#3d4650" />
        <stop offset="54%" stopColor="#202831" />
        <stop offset="88%" stopColor="#111820" />
        <stop offset="100%" stopColor="#070b10" />
      </radialGradient>
      <radialGradient id="dkCymbal" cx="36%" cy="25%" r="82%">
        <stop offset="0%" stopColor="#fff0a6" />
        <stop offset="24%" stopColor="#dcb95e" />
        <stop offset="54%" stopColor="#b78c32" />
        <stop offset="78%" stopColor="#d5ab4e" />
        <stop offset="100%" stopColor="#664614" />
      </radialGradient>
      <radialGradient id="dkCymbalBell" cx="35%" cy="24%" r="84%">
        <stop offset="0%" stopColor="#fff5bd" />
        <stop offset="50%" stopColor="#d5a84e" />
        <stop offset="100%" stopColor="#745019" />
      </radialGradient>
      <linearGradient id="dkCymbalGlint" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.46} />
        <stop offset="55%" stopColor="#ffffff" stopOpacity={0.03} />
        <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
      </linearGradient>
      <radialGradient id="dkStudio" cx="50%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#26313a" />
        <stop offset="44%" stopColor="#111820" />
        <stop offset="100%" stopColor="#04070a" />
      </radialGradient>
      <radialGradient id="dkSpotlight" cx="50%" cy="0%" r="100%">
        <stop offset="0%" stopColor="#d7e9f5" stopOpacity={0.2} />
        <stop offset="58%" stopColor="#7aa2ba" stopOpacity={0.04} />
        <stop offset="100%" stopColor="#000000" stopOpacity={0} />
      </radialGradient>
      <linearGradient id="dkFloor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#131a20" />
        <stop offset="100%" stopColor="#05080b" />
      </linearGradient>
      <pattern id="dkWoodGrain" width={54} height={18} patternUnits="userSpaceOnUse">
        <path d="M -8 6 C 4 1, 12 13, 25 7 S 46 4, 62 10" fill="none" stroke="#f7b96d" strokeOpacity={0.34} strokeWidth={1.4} />
        <path d="M -6 15 C 8 10, 16 20, 31 14 S 51 11, 64 16" fill="none" stroke="#2a0b07" strokeOpacity={0.35} strokeWidth={1.2} />
      </pattern>
      <filter id="dkSoftShadow" x="-20%" y="-40%" width="140%" height="180%">
        <feGaussianBlur stdDeviation={18} />
      </filter>
    </defs>
  );
}

export default function DrumKit() {
  const [hits, setHits] = useState<Record<PieceId, number>>(INITIAL_HITS);
  const [lastPiece, setLastPiece] = useState<PieceId | null>(null);
  const mode = useLayoutMode();
  const layout = LAYOUTS[mode];

  const trigger = useCallback((id: PieceId) => {
    void ensureAudioRunning();
    SOUNDS[id]();
    setHits((current) => ({ ...current, [id]: current[id] + 1 }));
    setLastPiece(id);
  }, []);

  useEffect(() => () => stopAllDrums(), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const id = CODEMAP[event.code];
      if (!id) return;
      event.preventDefault();
      trigger(id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [trigger]);

  const heightBudget = mode === "landscape" ? 72 : mode === "portrait" ? 160 : 300;

  return (
    <div className="w-full select-none" onContextMenu={(event) => event.preventDefault()}>
      <style>{`
        .dk-stage { box-shadow: 0 18px 42px rgba(0, 0, 0, .48), inset 0 1px 0 rgba(255,255,255,.06); }
        .dk-svg { -webkit-tap-highlight-color: transparent; }
        .dk-piece { cursor: pointer; outline: none; }
        .dk-piece:focus-visible { filter: drop-shadow(0 0 8px rgba(91, 188, 255, .96)); }
        .dk-hihat-zone:focus-visible rect { fill: rgba(77, 174, 235, .13); stroke: #72c5f5; stroke-width: 4px; }
        .dk-anim-cymbal { transform-box: fill-box; transform-origin: center; animation: dkCymbal 560ms cubic-bezier(.2,.75,.3,1); }
        .dk-anim-head { transform-box: fill-box; transform-origin: center; animation: dkHead 160ms ease-out; }
        .dk-anim-kick { transform-box: fill-box; transform-origin: center; animation: dkKick 180ms ease-out; }
        .dk-flash { opacity: 0; animation: dkFlash 180ms ease-out forwards; pointer-events: none; }
        @keyframes dkCymbal {
          0% { transform: rotate(0deg) scaleY(1); }
          14% { transform: rotate(1.8deg) scaleY(.78); }
          38% { transform: rotate(-1.2deg) scaleY(1.08); }
          68% { transform: rotate(.6deg) scaleY(.96); }
          100% { transform: rotate(0deg) scaleY(1); }
        }
        @keyframes dkHead {
          0% { transform: scale(1); }
          38% { transform: scale(.965); }
          100% { transform: scale(1); }
        }
        @keyframes dkKick {
          0% { transform: scale(1); }
          38% { transform: scale(.978); }
          100% { transform: scale(1); }
        }
        @keyframes dkFlash {
          0% { opacity: .35; }
          100% { opacity: 0; }
        }
        @media (hover: hover) {
          .dk-piece:hover { filter: brightness(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dk-anim-cymbal, .dk-anim-head, .dk-anim-kick, .dk-flash { animation: none; }
        }
      `}</style>

      <div
        className="dk-stage mx-auto w-full max-w-[1120px] overflow-hidden rounded-[clamp(0.75rem,2vw,1.5rem)]"
        style={{
          aspectRatio: `${layout.width} / ${layout.height}`,
          maxHeight: `calc(100dvh - ${heightBudget}px)`,
        }}
      >
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="dk-svg block h-full w-full touch-none"
          role="group"
          aria-label="Batería acústica interactiva"
        >
          <SvgDefs />
          <StageBackground width={layout.width} height={layout.height} />

          <g aria-hidden="true" pointerEvents="none">
            <rect x={layout.width * 0.38} y={18} width={layout.width * 0.24} height={34} rx={17} fill="#090d11" fillOpacity={0.78} stroke="#ffffff" strokeOpacity={0.1} />
            <text x={layout.width * 0.5} y={40} textAnchor="middle" fill="#c9d2d9" fontSize={15} fontWeight={700} letterSpacing={2.4}>
              KIT DE ESTUDIO
            </text>
          </g>

          <DrumHardware layout={layout} mode={mode} />

          <Cymbal id="crash" layout={layout.crash} hit={hits.crash} onTrigger={trigger} kind="crash" />
          <Cymbal id="ride" layout={layout.ride} hit={hits.ride} onTrigger={trigger} kind="ride" />

          <KickDrum layout={layout.kick} hit={hits.kick} onTrigger={trigger} />

          <Drum id="tom1" layout={layout.tom1} hit={hits.tom1} onTrigger={trigger} />
          <Drum id="tom2" layout={layout.tom2} hit={hits.tom2} onTrigger={trigger} />

          <HiHat layout={layout.hihat} closedHit={hits.hhClosed} openHit={hits.hhOpen} onTrigger={trigger} />
          <Drum id="snare" layout={layout.snare} hit={hits.snare} onTrigger={trigger} finish="metal" />
          <Drum id="tomFloor" layout={layout.floorTom} hit={hits.tomFloor} onTrigger={trigger} />
        </svg>
      </div>

      <div className="mt-3 hidden flex-wrap items-center justify-center gap-x-3 gap-y-1 lg:flex" aria-hidden="true">
        {KEY_HINTS.map((id) => (
          <span key={id} className="flex items-center gap-1 text-[10px] text-gray-500">
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-gray-600/50 bg-[#1a2129] px-1 font-mono text-[9px] text-gray-400">
              {PIECE_META[id].key}
            </kbd>
            {PIECE_META[id].name.toLocaleLowerCase("es")}
          </span>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {lastPiece ? `${PIECE_META[lastPiece].name} activado` : ""}
      </p>
    </div>
  );
}
