// Pure reducer for the segmented "Día hh:mm AM – hh:mm AM" cell editor. Kept
// React-free (like time.ts) so it is unit tested directly: a later, thin
// React component only renders spans per segment and forwards
// KeyboardEvent.key into `timeRangeReducer`.
import { DAY_ORDER, type DayCode } from "./types";
import {
  defaultEndPeriod,
  defaultPeriodForHour,
  from12h,
  to12h,
  validateRange,
} from "./time";

export type SegId = "day" | "sh" | "sm" | "sp" | "eh" | "em" | "ep";
export const SEGMENTS: SegId[] = ["day", "sh", "sm", "sp", "eh", "em", "ep"];

export interface TimeEditorState {
  day: DayCode | null;
  sh: string;
  sm: string;
  sp: "AM" | "PM" | null; // raw typed buffers ("", "1", "09") so partial entry is visible
  eh: string;
  em: string;
  ep: "AM" | "PM" | null;
  active: SegId;
  touched: boolean; // any edit since creation
  error: string | null; // set by setError; cleared by the next key edit
}

export interface TimeEditorInitial {
  day: DayCode | null;
  start: number | null;
  end: number | null;
}

export type EditorAction =
  | { type: "key"; key: string; shift?: boolean } // raw KeyboardEvent.key
  | { type: "focusSegment"; seg: SegId }
  | { type: "setError"; error: string | null };

export type KeyOutcome = "handled" | "commit" | "cancel" | "passthrough";

const pad2 = (n: number): string => String(n).padStart(2, "0");

const isDigit = (key: string): boolean => key.length === 1 && key >= "0" && key <= "9";

const isDayLetter = (key: string): boolean => /^[LKMJVSD]$/i.test(key);

const isPeriodLetter = (key: string): boolean => key === "a" || key === "A" || key === "p" || key === "P";

const isDashJump = (key: string): boolean => key === "-" || key === "–" || key === ">";

const ARROW_AND_EDIT_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Backspace",
  "Delete",
]);

const emptyState = (): TimeEditorState => ({
  day: null,
  sh: "",
  sm: "",
  sp: null,
  eh: "",
  em: "",
  ep: null,
  active: "day",
  touched: false,
  error: null,
});

export function createEditorState(
  initial: TimeEditorInitial | null,
  seed?: string | null,
): TimeEditorState {
  if (seed != null) {
    return timeRangeReducer(emptyState(), { type: "key", key: seed });
  }
  const state = emptyState();
  if (initial === null) return state;
  state.day = initial.day;
  if (initial.start !== null) {
    const { hour12, minute, period } = to12h(initial.start);
    state.sh = pad2(hour12);
    state.sm = pad2(minute);
    state.sp = period;
  }
  if (initial.end !== null) {
    const { hour12, minute, period } = to12h(initial.end);
    state.eh = pad2(hour12);
    state.em = pad2(minute);
    state.ep = period;
  }
  return state;
}

// --- hour/minute digit-buffer entry -----------------------------------

/** Digit entry for sh/eh: buffers hold at most 2 chars ("1".."12"). */
const hourDigitEntry = (buffer: string, digit: string): { value: string; advance: boolean } => {
  if (buffer === "0") {
    if (digit === "0") return { value: buffer, advance: false }; // ignore
    return { value: buffer + digit, advance: true }; // "0d"
  }
  if (buffer === "1") {
    if (digit >= "0" && digit <= "2") return { value: buffer + digit, advance: true }; // "10"/"11"/"12"
    return { value: buffer, advance: false }; // ignore, stays "1"
  }
  // Empty buffer, a full 2-char buffer, or a single committed digit (2-9)
  // that already advanced away: treat the digit as a fresh entry.
  if (digit === "0" || digit === "1") return { value: digit, advance: false };
  return { value: digit, advance: true };
};

/** Digit entry for sm/em: buffers hold at most 2 chars ("00".."59"). */
const minuteDigitEntry = (buffer: string, digit: string): { value: string; advance: boolean } => {
  if (buffer.length === 1) {
    return { value: buffer + digit, advance: true };
  }
  // Empty or a full 2-char buffer: fresh entry.
  if (digit >= "0" && digit <= "5") return { value: digit, advance: false };
  return { value: "0" + digit, advance: true };
};

const applyDigit = (s: TimeEditorState, digit: string): TimeEditorState => {
  let active = s.active;
  if (active === "day") {
    active = "sh";
  } else if (active === "sp") {
    active = "eh";
  } else if (active === "ep") {
    return { ...s, active }; // ignore, stay on ep
  }

  if (active === "sh") {
    const { value, advance } = hourDigitEntry(s.sh, digit);
    return { ...s, sh: value, active: advance ? "sm" : "sh" };
  }
  if (active === "eh") {
    const { value, advance } = hourDigitEntry(s.eh, digit);
    return { ...s, eh: value, active: advance ? "em" : "eh" };
  }
  if (active === "sm") {
    const { value, advance } = minuteDigitEntry(s.sm, digit);
    return { ...s, sm: value, active: advance ? "sp" : "sm" };
  }
  if (active === "em") {
    const { value, advance } = minuteDigitEntry(s.em, digit);
    return { ...s, em: value, active: advance ? "ep" : "em" };
  }
  return { ...s, active };
};

const applyDayLetter = (s: TimeEditorState, key: string): TimeEditorState => {
  const day = key.toUpperCase() as DayCode;
  const active = s.active === "day" ? "sh" : s.active;
  return { ...s, day, active };
};

const applyPeriodLetter = (s: TimeEditorState, key: string): TimeEditorState => {
  const period: "AM" | "PM" = key.toLowerCase() === "a" ? "AM" : "PM";
  const isStart = s.active === "day" || s.active === "sh" || s.active === "sm" || s.active === "sp";
  if (isStart) return { ...s, sp: period, active: "eh" };
  return { ...s, ep: period, active: "ep" };
};

const applyColon = (s: TimeEditorState): TimeEditorState => {
  if (s.active === "sh") return { ...s, active: "sm" };
  if (s.active === "eh") return { ...s, active: "em" };
  return { ...s }; // ignore elsewhere
};

const applyDashJump = (s: TimeEditorState): TimeEditorState => ({ ...s, active: "eh" });

const applyArrowHorizontal = (s: TimeEditorState, dir: "left" | "right"): TimeEditorState => {
  const idx = SEGMENTS.indexOf(s.active);
  const nextIdx =
    dir === "right" ? Math.min(idx + 1, SEGMENTS.length - 1) : Math.max(idx - 1, 0);
  return { ...s, active: SEGMENTS[nextIdx] };
};

const arrowHour = (buf: string, dir: "up" | "down"): string => {
  if (buf === "") return "08";
  const n = parseInt(buf, 10);
  const delta = dir === "up" ? 1 : -1;
  const next = ((n - 1 + delta + 12) % 12) + 1;
  return pad2(next);
};

const arrowMinute = (buf: string, dir: "up" | "down"): string => {
  if (buf === "") return "00";
  const n = parseInt(buf, 10);
  const delta = dir === "up" ? 5 : -5;
  const next = ((n + delta) % 60 + 60) % 60;
  return pad2(next);
};

const arrowPeriod = (period: "AM" | "PM" | null): "AM" | "PM" => {
  if (period === null) return "AM";
  return period === "AM" ? "PM" : "AM";
};

const applyArrowVertical = (s: TimeEditorState, dir: "up" | "down"): TimeEditorState => {
  const { active } = s;
  if (active === "day") {
    let day: DayCode;
    if (s.day === null) {
      day = dir === "up" ? "L" : "D";
    } else {
      const idx = DAY_ORDER.indexOf(s.day);
      const delta = dir === "up" ? 1 : -1;
      day = DAY_ORDER[(idx + delta + DAY_ORDER.length) % DAY_ORDER.length];
    }
    return { ...s, day };
  }
  if (active === "sh") return { ...s, sh: arrowHour(s.sh, dir) };
  if (active === "eh") return { ...s, eh: arrowHour(s.eh, dir) };
  if (active === "sm") return { ...s, sm: arrowMinute(s.sm, dir) };
  if (active === "em") return { ...s, em: arrowMinute(s.em, dir) };
  if (active === "sp") return { ...s, sp: arrowPeriod(s.sp) };
  return { ...s, ep: arrowPeriod(s.ep) };
};

const isSegmentEmpty = (s: TimeEditorState, seg: SegId): boolean => {
  switch (seg) {
    case "day":
      return s.day === null;
    case "sh":
      return s.sh === "";
    case "sm":
      return s.sm === "";
    case "sp":
      return s.sp === null;
    case "eh":
      return s.eh === "";
    case "em":
      return s.em === "";
    case "ep":
      return s.ep === null;
  }
};

const clearSegment = (s: TimeEditorState, seg: SegId): TimeEditorState => {
  switch (seg) {
    case "day":
      return { ...s, day: null };
    case "sh":
      return { ...s, sh: "" };
    case "sm":
      return { ...s, sm: "" };
    case "sp":
      return { ...s, sp: null };
    case "eh":
      return { ...s, eh: "" };
    case "em":
      return { ...s, em: "" };
    case "ep":
      return { ...s, ep: null };
  }
};

const applyBackspace = (s: TimeEditorState): TimeEditorState => {
  if (!isSegmentEmpty(s, s.active)) return clearSegment(s, s.active);
  const idx = SEGMENTS.indexOf(s.active);
  return { ...s, active: SEGMENTS[Math.max(idx - 1, 0)] };
};

const applyDelete = (s: TimeEditorState): TimeEditorState => clearSegment(s, s.active);

/** Classifies and applies a single key. Returns `null` for unrecognized keys. */
const applyKey = (s: TimeEditorState, key: string): TimeEditorState | null => {
  if (isDigit(key)) return applyDigit(s, key);
  if (isDayLetter(key)) return applyDayLetter(s, key);
  if (isPeriodLetter(key)) return applyPeriodLetter(s, key);
  if (key === ":") return applyColon(s);
  if (isDashJump(key)) return applyDashJump(s);
  if (key === "ArrowLeft") return applyArrowHorizontal(s, "left");
  if (key === "ArrowRight") return applyArrowHorizontal(s, "right");
  if (key === "ArrowUp") return applyArrowVertical(s, "up");
  if (key === "ArrowDown") return applyArrowVertical(s, "down");
  if (key === "Backspace") return applyBackspace(s);
  if (key === "Delete") return applyDelete(s);
  return null;
};

export function timeRangeReducer(s: TimeEditorState, a: EditorAction): TimeEditorState {
  switch (a.type) {
    case "focusSegment":
      return { ...s, active: a.seg };
    case "setError":
      return { ...s, error: a.error };
    case "key": {
      const next = applyKey(s, a.key);
      if (next === null) return s; // unknown key: same state object
      return { ...next, touched: true, error: null };
    }
  }
}

export function keyOutcome(key: string, shift?: boolean): KeyOutcome {
  void shift; // part of the contract for callers; no key currently branches on it
  if (key === "Enter" || key === "Tab") return "commit";
  if (key === "Escape") return "cancel";
  if (isDigit(key) || isDayLetter(key) || isPeriodLetter(key)) return "handled";
  if (key === ":" || isDashJump(key)) return "handled";
  if (ARROW_AND_EDIT_KEYS.has(key)) return "handled";
  return "passthrough";
}

export function editorStateToDraft(
  s: TimeEditorState,
): { day: DayCode | null; start: number | null; end: number | null } {
  const start =
    s.sh && s.sm && s.sp
      ? from12h(+s.sh, +s.sm, s.sp)
      : s.sh
        ? from12h(+s.sh, +(s.sm || "0"), s.sp ?? defaultPeriodForHour(+s.sh))
        : null;
  const end =
    s.eh && s.em && s.ep
      ? from12h(+s.eh, +s.em, s.ep)
      : s.eh
        ? from12h(+s.eh, +(s.em || "0"), s.ep ?? defaultEndPeriod(+s.eh, +(s.em || "0"), start))
        : null;
  return { day: s.day, start, end };
}

export function resolveDraft(s: TimeEditorState): ReturnType<typeof validateRange> {
  return validateRange(editorStateToDraft(s));
}

export function isEmptyDraft(s: TimeEditorState): boolean {
  return (
    s.day === null &&
    s.sh === "" &&
    s.sm === "" &&
    s.sp === null &&
    s.eh === "" &&
    s.em === "" &&
    s.ep === null
  );
}

export function isChanged(s: TimeEditorState, initial: TimeEditorInitial | null): boolean {
  const draft = editorStateToDraft(s);
  const base = initial ?? { day: null, start: null, end: null };
  return draft.day !== base.day || draft.start !== base.start || draft.end !== base.end;
}

export function segmentText(s: TimeEditorState, seg: SegId): { text: string; placeholder: boolean } {
  switch (seg) {
    case "day":
      return { text: s.day ?? "Día", placeholder: s.day === null };
    case "sh":
      return s.sh === "" ? { text: "hh", placeholder: true } : { text: s.sh, placeholder: false };
    case "eh":
      return s.eh === "" ? { text: "hh", placeholder: true } : { text: s.eh, placeholder: false };
    case "sm":
      return s.sm === "" ? { text: "mm", placeholder: true } : { text: s.sm, placeholder: false };
    case "em":
      return s.em === "" ? { text: "mm", placeholder: true } : { text: s.em, placeholder: false };
    case "sp":
      return s.sp === null ? { text: "AM", placeholder: true } : { text: s.sp, placeholder: false };
    case "ep":
      return s.ep === null ? { text: "AM", placeholder: true } : { text: s.ep, placeholder: false };
  }
}
