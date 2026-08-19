// Which control inside a horario card a click was aimed at, and how to honour
// that aim once the editor is open. The rule the grid follows: open the select
// the admin actually clicked — never a neighbour — with exactly two exceptions,
//   1. día is not set yet: every other control is premature, so Día opens;
//   2. the aimed select is disabled: walk its fallback chain to the control
//      that has to be filled first (minutos → its hora, aula → hora inicio).
import type { DayCode } from "./types";

export type HorarioEditorTarget =
  | "day"
  | "aula"
  | "start"
  | "startMinute"
  | "end"
  | "endMinute";

/** The aria-label of the <select> each target addresses. */
export const HORARIO_TARGET_LABEL: Record<HorarioEditorTarget, string> = {
  day: "Día",
  aula: "Aula",
  start: "Hora de inicio: hora",
  startMinute: "Hora de inicio: minutos",
  end: "Hora de fin: hora",
  endMinute: "Hora de fin: minutos",
};

/** Where the aim moves when the addressed select turns out to be disabled. */
const FALLBACK: Partial<Record<HorarioEditorTarget, HorarioEditorTarget>> = {
  aula: "start",
  startMinute: "start",
  endMinute: "end",
  end: "start",
};

export function resolveHorarioEditorTarget(
  day: DayCode | null,
  requested: HorarioEditorTarget,
): HorarioEditorTarget {
  return day === null && requested !== "day" ? "day" : requested;
}

/**
 * The target itself followed by every fallback behind it, nearest first. The
 * caller takes the first one whose select exists and is enabled.
 */
export function horarioTargetChain(target: HorarioEditorTarget): HorarioEditorTarget[] {
  const chain: HorarioEditorTarget[] = [];
  let current: HorarioEditorTarget | undefined = target;
  while (current && !chain.includes(current)) {
    chain.push(current);
    current = FALLBACK[current];
  }
  return chain;
}

/**
 * The select to open for `target` within `root`, skipping disabled ones down
 * the fallback chain. Returns null when the card has none of them enabled.
 */
export function findHorarioTargetSelect(
  root: ParentNode,
  target: HorarioEditorTarget,
): HTMLSelectElement | null {
  for (const step of horarioTargetChain(target)) {
    const el = root.querySelector<HTMLSelectElement>(
      `select[aria-label="${HORARIO_TARGET_LABEL[step]}"]`,
    );
    if (el && !el.disabled) return el;
  }
  return null;
}
