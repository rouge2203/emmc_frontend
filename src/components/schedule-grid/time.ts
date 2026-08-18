// Pure time helpers for the schedule grid. Keep this module React-free —
// it is unit tested directly and reused by both the grid cells and any
// future non-React consumers (e.g. a Node script).
import { DAY_ORDER, type DayCode, type Slot, type TimeRangeValue } from "./types";

export interface TimeParts {
  hour12: number; // 1-12
  minute: number; // 0-59
  period: "AM" | "PM";
}

export const MIN_DURATION_MINUTES = 30;

/** Parses a "HH:MM" or "HH:MM:SS" 24h API time string into minutes since midnight. */
export const parseApiTime = (v: string | null | undefined): number | null => {
  if (!v) return null;
  // Same regex as src/components/TimeSelect.tsx line 28.
  const match = v.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour24 = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (
    Number.isNaN(hour24) ||
    Number.isNaN(minute) ||
    hour24 < 0 ||
    hour24 > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return hour24 * 60 + minute;
};

/** Formats minutes since midnight as a zero-padded 24h "HH:MM" API time string. */
export const toApiTime = (min: number): string => {
  const hour24 = Math.floor(min / 60);
  const minute = min % 60;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

/** Splits minutes since midnight into 12h hour/minute/period parts. */
export const to12h = (min: number): TimeParts => {
  const hour24 = Math.floor(min / 60);
  const minute = min % 60;
  return {
    hour12: hour24 % 12 || 12,
    minute,
    period: hour24 >= 12 ? "PM" : "AM",
  };
};

/** Composes 12h hour/minute/period parts back into minutes since midnight. */
export const from12h = (hour12: number, minute: number, period: "AM" | "PM"): number => {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return hour24 * 60 + minute;
};

/** Formats minutes since midnight as "09:00 AM" / "12:00 PM". */
export const format12h = (min: number): string => {
  const { hour12, minute, period } = to12h(min);
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
};

/** Formats minutes since midnight as "9:00 AM" (no leading zero on the hour). */
export const format12hShort = (min: number): string => {
  const { hour12, minute, period } = to12h(min);
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
};

/** "00:00 – 00:00" is the placeholder used for unassigned horarios. */
const PLACEHOLDER_RANGE = "00:00 – 00:00";

/** Formats a slot for grid cell display, flagging incomplete slots as muted. */
export const formatSlotLabel = (slot: Slot | null): { text: string; muted: boolean } => {
  if (slot && slot.start !== null && slot.end !== null) {
    const day = slot.day ? `${slot.day} ` : "";
    return { text: `${day}${format12h(slot.start)} – ${format12h(slot.end)}`, muted: false };
  }
  if (slot && slot.day) {
    return { text: `${slot.day} ${PLACEHOLDER_RANGE}`, muted: true };
  }
  return { text: PLACEHOLDER_RANGE, muted: true };
};

/**
 * Nav-mode label for a horario's select-styled box: "L · 9:00 AM – 10:00 AM"
 * (day code · 12h times without a leading zero on the hour), or the muted
 * "Día · hora" placeholder when the slot is empty/incomplete.
 */
export const formatSlotBox = (slot: Slot | null): { text: string; muted: boolean } => {
  if (slot && slot.day && slot.start !== null && slot.end !== null) {
    return {
      text: `${slot.day} · ${format12hShort(slot.start)} – ${format12hShort(slot.end)}`,
      muted: false,
    };
  }
  return { text: "Día · hora", muted: true };
};

// When an admin picks an hour on an empty field, guess the half of the day the
// school actually teaches in: 8-11 reads as morning, everything else as
// afternoon/evening (copy of src/components/TimeSelect.tsx lines 59-60).
export const defaultPeriodForHour = (hour12: number): "AM" | "PM" =>
  hour12 >= 8 && hour12 <= 11 ? "AM" : "PM";

/**
 * Guesses the AM/PM for an end time given the already-known start time: pick
 * the earliest candidate (AM tried before PM) that lands strictly after the
 * start. Falls back to defaultPeriodForHour when there's no start yet or
 * neither candidate is after it.
 */
export const defaultEndPeriod = (
  endHour12: number,
  endMinute: number,
  startMin: number | null,
): "AM" | "PM" => {
  if (startMin !== null) {
    for (const period of ["AM", "PM"] as const) {
      if (from12h(endHour12, endMinute, period) > startMin) return period;
    }
  }
  return defaultPeriodForHour(endHour12);
};

/** Position of a day within DAY_ORDER (L=0 ... D=6). */
export const dayIndex = (d: DayCode): number => DAY_ORDER.indexOf(d);

export const validateRange = (d: {
  day: DayCode | null;
  start: number | null;
  end: number | null;
}): { ok: true; value: TimeRangeValue } | { ok: false; error: string } => {
  if (d.day === null) return { ok: false, error: "Falta el día" };
  if (d.start === null) return { ok: false, error: "Falta hora de inicio" };
  if (d.end === null) return { ok: false, error: "Falta hora de fin" };
  if (d.end <= d.start) return { ok: false, error: "La hora de fin debe ser mayor" };
  if (d.end - d.start < MIN_DURATION_MINUTES) {
    return { ok: false, error: "Duración mínima 30 min" };
  }
  return { ok: true, value: { day: d.day, start: d.start, end: d.end } };
};

/** Formats a 24h conflict range for tooltips, e.g. "L 09:00–10:00". */
export const formatConflictRange = (day: DayCode, start: number, end: number): string =>
  `${day} ${toApiTime(start)}–${toApiTime(end)}`;
