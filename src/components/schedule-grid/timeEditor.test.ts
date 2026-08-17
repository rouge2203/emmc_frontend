import { describe, expect, it } from "vitest";
import {
  createEditorState,
  editorStateToDraft,
  isChanged,
  isEmptyDraft,
  keyOutcome,
  resolveDraft,
  segmentText,
  timeRangeReducer,
  type SegId,
  type TimeEditorState,
} from "./timeEditor";

/** Feeds a string of keys through the reducer one character at a time. */
const type = (state: TimeEditorState, keys: string): TimeEditorState => {
  let s = state;
  for (const k of keys) {
    s = timeRangeReducer(s, { type: "key", key: k });
  }
  return s;
};

const pressKey = (state: TimeEditorState, key: string): TimeEditorState =>
  timeRangeReducer(state, { type: "key", key });

/** An empty state with `active` moved to `seg` without touching any buffer. */
const focused = (seg: SegId): TimeEditorState =>
  timeRangeReducer(createEditorState(null), { type: "focusSegment", seg });

describe("createEditorState", () => {
  it("is empty with active day when initial is null", () => {
    expect(createEditorState(null)).toEqual({
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
  });

  it("prefills hours/minutes/periods from an initial value (Task 5 requirement 5)", () => {
    const s = createEditorState({ day: "M", start: 810, end: 900 });
    expect(s.day).toBe("M");
    expect(s.sh).toBe("01");
    expect(s.sm).toBe("30");
    expect(s.sp).toBe("PM");
    expect(s.eh).toBe("03");
    expect(s.em).toBe("00");
    expect(s.ep).toBe("PM");
    expect(s.active).toBe("day");
    expect(s.touched).toBe(false);
  });

  it("isChanged is false right after a prefill and true after one edit", () => {
    const initial = { day: "M" as const, start: 810, end: 900 };
    const s = createEditorState(initial);
    expect(isChanged(s, initial)).toBe(false);
    const edited = pressKey(s, "2");
    expect(isChanged(edited, initial)).toBe(true);
  });

  it("seeds from a single digit, applying it as a key (Task 5 requirement 4)", () => {
    const s = createEditorState(null, "9");
    expect(s.sh).toBe("9");
    expect(s.active).toBe("sm");
    expect(s.touched).toBe(true);
  });

  it("seeds from a single day letter, applying it as a key (Task 5 requirement 4)", () => {
    const s = createEditorState(null, "k");
    expect(s.day).toBe("K");
    expect(s.active).toBe("sh");
    expect(s.touched).toBe(true);
  });
});

describe("typing a full range (Task 5 requirement 1)", () => {
  it("L 9 0 0 a 1 0 0 0 -> Monday 09:00 AM - 10:00 AM, active ends on ep", () => {
    const s = type(createEditorState(null), "L900a1000");
    expect(editorStateToDraft(s)).toEqual({ day: "L", start: 540, end: 600 });
    expect(resolveDraft(s)).toEqual({
      ok: true,
      value: { day: "L", start: 540, end: 600 },
    });
    expect(s.active).toBe("ep");
  });
});

describe("hour segment digit entry / auto-advance (Task 5 requirement 2)", () => {
  it("2-9 stores a single digit and auto-advances to minutes", () => {
    const s = pressKey(focused("sh"), "2");
    expect(s.sh).toBe("2");
    expect(s.active).toBe("sm");
  });

  it("1 waits for a second digit", () => {
    const s = pressKey(focused("sh"), "1");
    expect(s.sh).toBe("1");
    expect(s.active).toBe("sh");
  });

  it("1,0 completes to 10 and advances", () => {
    const s = type(focused("sh"), "10");
    expect(s.sh).toBe("10");
    expect(s.active).toBe("sm");
  });

  it("1,5 ignores the invalid second digit and stays on sh as 1", () => {
    const s = type(focused("sh"), "15");
    expect(s.sh).toBe("1");
    expect(s.active).toBe("sh");
  });

  it("0,9 completes to 09 and advances", () => {
    const s = type(focused("sh"), "09");
    expect(s.sh).toBe("09");
    expect(s.active).toBe("sm");
  });

  it("a fresh digit after a committed single digit replaces the buffer", () => {
    const nine = pressKey(focused("sh"), "9"); // sh:"9", active sm (already advanced)
    const backOnHour = timeRangeReducer(nine, { type: "focusSegment", seg: "sh" });
    expect(pressKey(backOnHour, "1").sh).toBe("1");
    expect(pressKey(backOnHour, "0").sh).toBe("0");
    expect(pressKey(backOnHour, "7").sh).toBe("7");
  });
});

describe("minute segment digit entry (Task 5 requirement 3)", () => {
  it("6 stores 06 and advances", () => {
    const s = pressKey(focused("sm"), "6");
    expect(s.sm).toBe("06");
    expect(s.active).toBe("sp");
  });

  it("3,0 completes to 30 and advances", () => {
    const s = type(focused("sm"), "30");
    expect(s.sm).toBe("30");
    expect(s.active).toBe("sp");
  });

  it("0-5 waits for a second digit", () => {
    const s = pressKey(focused("sm"), "3");
    expect(s.sm).toBe("3");
    expect(s.active).toBe("sm");
  });
});

describe(": and - jumps (Task 5 requirement 6)", () => {
  it(": moves sh -> sm", () => {
    expect(pressKey(focused("sh"), ":").active).toBe("sm");
  });

  it(": moves eh -> em", () => {
    expect(pressKey(focused("eh"), ":").active).toBe("em");
  });

  it(": is ignored on any other segment", () => {
    expect(pressKey(focused("sm"), ":").active).toBe("sm");
    expect(pressKey(focused("day"), ":").active).toBe("day");
  });

  it("- jumps straight to eh", () => {
    expect(pressKey(focused("sm"), "-").active).toBe("eh");
  });

  it("en dash (–) jumps straight to eh", () => {
    expect(pressKey(focused("day"), "–").active).toBe("eh");
  });

  it("> jumps straight to eh", () => {
    expect(pressKey(focused("sp"), ">").active).toBe("eh");
  });
});

describe("ArrowUp / ArrowDown (Task 5 requirement 7)", () => {
  it("cycles the day forward from null on ArrowUp", () => {
    expect(pressKey(createEditorState(null), "ArrowUp").day).toBe("L");
  });

  it("cycles the day backward from null on ArrowDown", () => {
    expect(pressKey(createEditorState(null), "ArrowDown").day).toBe("D");
  });

  it("ArrowUp advances L -> K", () => {
    const s: TimeEditorState = { ...createEditorState(null), day: "L" };
    expect(pressKey(s, "ArrowUp").day).toBe("K");
  });

  it("ArrowDown wraps L -> D", () => {
    const s: TimeEditorState = { ...createEditorState(null), day: "L" };
    expect(pressKey(s, "ArrowDown").day).toBe("D");
  });

  it("hour wraps 12 -> 1 on ArrowUp", () => {
    const s: TimeEditorState = { ...focused("sh"), sh: "12" };
    expect(pressKey(s, "ArrowUp").sh).toBe("01");
  });

  it("hour wraps 1 -> 12 on ArrowDown", () => {
    const s: TimeEditorState = { ...focused("sh"), sh: "1" };
    expect(pressKey(s, "ArrowDown").sh).toBe("12");
  });

  it("hour defaults to 08 from empty on either arrow", () => {
    expect(pressKey(focused("sh"), "ArrowUp").sh).toBe("08");
    expect(pressKey(focused("eh"), "ArrowDown").eh).toBe("08");
  });

  it("minute wraps 55 -> 00 on ArrowUp", () => {
    const s: TimeEditorState = { ...focused("sm"), sm: "55" };
    expect(pressKey(s, "ArrowUp").sm).toBe("00");
  });

  it("minute defaults to 00 from empty", () => {
    expect(pressKey(focused("em"), "ArrowDown").em).toBe("00");
  });

  it("AM/PM toggles, defaulting null to AM", () => {
    const first = pressKey(focused("sp"), "ArrowUp");
    expect(first.sp).toBe("AM");
    expect(pressKey(first, "ArrowDown").sp).toBe("PM");
  });
});

describe("Backspace and Delete (Task 5 requirement 8)", () => {
  it("Backspace clears a non-empty active segment without moving", () => {
    const s: TimeEditorState = { ...focused("sh"), sh: "09" };
    const next = pressKey(s, "Backspace");
    expect(next.sh).toBe("");
    expect(next.active).toBe("sh");
  });

  it("Backspace on an empty segment moves active to the previous segment", () => {
    const next = pressKey(focused("sm"), "Backspace");
    expect(next.sm).toBe("");
    expect(next.active).toBe("sh");
  });

  it("Backspace at the first segment stays put", () => {
    const next = pressKey(createEditorState(null), "Backspace");
    expect(next.active).toBe("day");
  });

  it("Delete clears the active segment without moving", () => {
    const s: TimeEditorState = { ...focused("sh"), sh: "09" };
    const next = pressKey(s, "Delete");
    expect(next.sh).toBe("");
    expect(next.active).toBe("sh");
  });
});

describe("digit routing (Task 5 requirement 9)", () => {
  it("digits typed on day route to sh", () => {
    const s = pressKey(createEditorState(null), "5");
    expect(s.sh).toBe("5");
    expect(s.active).toBe("sm");
  });

  it("digits typed on sp route to eh", () => {
    const s = pressKey(focused("sp"), "5");
    expect(s.eh).toBe("5");
    expect(s.active).toBe("em");
  });

  it("digits typed on ep are ignored (stay on ep)", () => {
    const s = pressKey(focused("ep"), "5");
    expect(s.eh).toBe("");
    expect(s.em).toBe("");
    expect(s.active).toBe("ep");
  });
});

describe("a/p letters (Task 5 requirement 10)", () => {
  it("a on the start side sets sp to AM and moves active to eh", () => {
    const s = pressKey(focused("sh"), "a");
    expect(s.sp).toBe("AM");
    expect(s.active).toBe("eh");
  });

  it("p on the start side sets sp to PM and moves active to eh", () => {
    const s = pressKey(focused("sh"), "p");
    expect(s.sp).toBe("PM");
    expect(s.active).toBe("eh");
  });

  it("a on the end side sets ep to AM and stays on ep", () => {
    const s = pressKey(focused("eh"), "a");
    expect(s.ep).toBe("AM");
    expect(s.active).toBe("ep");
  });

  it("day counts as the start side", () => {
    const s = pressKey(createEditorState(null), "p");
    expect(s.sp).toBe("PM");
    expect(s.active).toBe("eh");
  });
});

describe("resolveDraft defaults (Task 5 requirement 11)", () => {
  it("sh only -> start at :00 AM by defaultPeriodForHour", () => {
    const s: TimeEditorState = { ...createEditorState(null), sh: "9" };
    expect(editorStateToDraft(s)).toEqual({ day: null, start: 540, end: null });
  });

  it("end hour 1 with a known 11:00 AM start resolves to 1:00 PM via defaultEndPeriod", () => {
    const s: TimeEditorState = {
      ...createEditorState(null),
      sh: "11",
      sm: "00",
      sp: "AM",
      eh: "1",
    };
    expect(editorStateToDraft(s)).toEqual({ day: null, start: 660, end: 780 });
  });
});

describe("resolveDraft errors (Task 5 requirement 12)", () => {
  it("reports a missing day", () => {
    const s: TimeEditorState = {
      ...createEditorState(null),
      sh: "09",
      sm: "00",
      sp: "AM",
      eh: "10",
      em: "00",
      ep: "AM",
    };
    expect(resolveDraft(s)).toEqual({ ok: false, error: "Falta el día" });
  });

  it("reports the end must be later than the start", () => {
    const s: TimeEditorState = {
      ...createEditorState(null),
      day: "L",
      sh: "11",
      sm: "00",
      sp: "AM",
      eh: "10",
      em: "00",
      ep: "AM",
    };
    expect(resolveDraft(s)).toEqual({ ok: false, error: "La hora de fin debe ser mayor" });
  });

  it("reports the minimum duration for a 20-minute range", () => {
    const s: TimeEditorState = {
      ...createEditorState(null),
      day: "L",
      sh: "09",
      sm: "00",
      sp: "AM",
      eh: "09",
      em: "20",
      ep: "AM",
    };
    expect(resolveDraft(s)).toEqual({ ok: false, error: "Duración mínima 30 min" });
  });
});

describe("keyOutcome (Task 5 requirement 13)", () => {
  it("commits on Enter and Tab", () => {
    expect(keyOutcome("Enter")).toBe("commit");
    expect(keyOutcome("Tab")).toBe("commit");
  });

  it("cancels on Escape", () => {
    expect(keyOutcome("Escape")).toBe("cancel");
  });

  it("handles digits, arrows and editing keys", () => {
    expect(keyOutcome("9")).toBe("handled");
    expect(keyOutcome("ArrowUp")).toBe("handled");
    expect(keyOutcome("Backspace")).toBe("handled");
  });

  it("passes through anything it doesn't recognize", () => {
    expect(keyOutcome("F5")).toBe("passthrough");
    expect(keyOutcome("Shift", true)).toBe("passthrough");
  });
});

describe("segmentText (Task 5 requirement 14)", () => {
  it("shows the day placeholder when unset and the code letter when set", () => {
    expect(segmentText(createEditorState(null), "day")).toEqual({
      text: "Día",
      placeholder: true,
    });
    const s = pressKey(createEditorState(null), "l");
    expect(segmentText(s, "day")).toEqual({ text: "L", placeholder: false });
  });

  it("shows hh/mm placeholders when empty and the raw buffer while typing", () => {
    expect(segmentText(createEditorState(null), "sh")).toEqual({
      text: "hh",
      placeholder: true,
    });
    expect(segmentText(createEditorState(null), "sm")).toEqual({
      text: "mm",
      placeholder: true,
    });
    const oneDigit: TimeEditorState = { ...createEditorState(null), sh: "9" };
    expect(segmentText(oneDigit, "sh")).toEqual({ text: "9", placeholder: false });
    const twoDigit: TimeEditorState = { ...createEditorState(null), sh: "09" };
    expect(segmentText(twoDigit, "sh")).toEqual({ text: "09", placeholder: false });
  });

  it("shows the AM placeholder when unset and the actual period when set", () => {
    expect(segmentText(createEditorState(null), "sp")).toEqual({
      text: "AM",
      placeholder: true,
    });
    const s: TimeEditorState = { ...createEditorState(null), sp: "PM" };
    expect(segmentText(s, "sp")).toEqual({ text: "PM", placeholder: false });
  });
});

describe("isEmptyDraft (Task 5 requirement 15)", () => {
  it("is true for a fresh empty state", () => {
    expect(isEmptyDraft(createEditorState(null))).toBe(true);
  });

  it("is false after a single key edit", () => {
    const s = pressKey(createEditorState(null), "l");
    expect(isEmptyDraft(s)).toBe(false);
  });
});

describe("focusSegment and setError actions", () => {
  it("focusSegment moves active without marking touched", () => {
    const s = timeRangeReducer(createEditorState(null), { type: "focusSegment", seg: "eh" });
    expect(s.active).toBe("eh");
    expect(s.touched).toBe(false);
  });

  it("setError sets the error without marking touched", () => {
    const s = timeRangeReducer(createEditorState(null), { type: "setError", error: "boom" });
    expect(s.error).toBe("boom");
    expect(s.touched).toBe(false);
  });

  it("the next key edit clears a previously set error", () => {
    const withError = timeRangeReducer(createEditorState(null), {
      type: "setError",
      error: "boom",
    });
    const s = pressKey(withError, "l");
    expect(s.error).toBeNull();
  });
});

describe("unknown keys", () => {
  it("returns the exact same state object, unchanged", () => {
    const s = createEditorState(null);
    const next = timeRangeReducer(s, { type: "key", key: "F5" });
    expect(next).toBe(s);
  });
});
