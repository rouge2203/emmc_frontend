import { describe, expect, it } from "vitest";
import {
  defaultEndPeriod,
  formatSlotRange,
  defaultPeriodForHour,
  dayIndex,
  format12h,
  format12hShort,
  formatConflictRange,
  formatSlotBox,
  formatSlotLabel,
  from12h,
  MIN_DURATION_MINUTES,
  parseApiTime,
  to12h,
  toApiTime,
  validateRange,
} from "./time";
import type { Slot } from "./types";

describe("parseApiTime", () => {
  it("parses HH:MM:SS", () => {
    expect(parseApiTime("09:00:00")).toBe(540);
  });
  it("parses a single-digit hour HH:MM", () => {
    expect(parseApiTime("9:05")).toBe(545);
  });
  it("returns null for null", () => {
    expect(parseApiTime(null)).toBeNull();
  });
  it("returns null for undefined", () => {
    expect(parseApiTime(undefined)).toBeNull();
  });
  it("returns null for an empty string", () => {
    expect(parseApiTime("")).toBeNull();
  });
  it("returns null for an out-of-range hour", () => {
    expect(parseApiTime("25:00")).toBeNull();
  });
  it("returns null for garbage input", () => {
    expect(parseApiTime("abc")).toBeNull();
  });
});

describe("toApiTime", () => {
  it("formats 540 minutes as 09:00", () => {
    expect(toApiTime(540)).toBe("09:00");
  });
  it("formats 810 minutes as 13:30", () => {
    expect(toApiTime(810)).toBe("13:30");
  });
});

describe("to12h / from12h round trips", () => {
  it("round-trips midnight (0)", () => {
    const parts = to12h(0);
    expect(parts).toEqual({ hour12: 12, minute: 0, period: "AM" });
    expect(from12h(parts.hour12, parts.minute, parts.period)).toBe(0);
  });
  it("round-trips noon (720)", () => {
    const parts = to12h(720);
    expect(parts).toEqual({ hour12: 12, minute: 0, period: "PM" });
    expect(from12h(parts.hour12, parts.minute, parts.period)).toBe(720);
  });
  it("round-trips the last minute of the day (1439)", () => {
    const parts = to12h(1439);
    expect(parts).toEqual({ hour12: 11, minute: 59, period: "PM" });
    expect(from12h(parts.hour12, parts.minute, parts.period)).toBe(1439);
  });
});

describe("format12h", () => {
  it("formats 540 as 09:00 AM", () => {
    expect(format12h(540)).toBe("09:00 AM");
  });
  it("formats 720 (noon) as 12:00 PM", () => {
    expect(format12h(720)).toBe("12:00 PM");
  });
  it("formats 0 (midnight) as 12:00 AM", () => {
    expect(format12h(0)).toBe("12:00 AM");
  });
});

describe("format12hShort", () => {
  it("drops the leading zero on the hour", () => {
    expect(format12hShort(540)).toBe("9:00 AM");
  });
  it("keeps two-digit hours and pads minutes", () => {
    expect(format12hShort(645)).toBe("10:45 AM");
    expect(format12hShort(720)).toBe("12:00 PM");
  });
});

describe("formatSlotBox", () => {
  it("formats a full slot as 'L · 9:00 AM – 10:00 AM'", () => {
    const slot: Slot = { scheduleId: 1, day: "L", start: 540, end: 600, classroomId: null };
    expect(formatSlotBox(slot)).toEqual({ text: "L · 9:00 AM – 10:00 AM", muted: false });
  });
  it("formats an open-ended slot as 'L · 9:00 AM'", () => {
    const slot: Slot = { scheduleId: 1, day: "L", start: 540, end: null, classroomId: null };
    expect(formatSlotBox(slot)).toEqual({ text: "L · 9:00 AM", muted: false });
  });
  it("shows the muted 'Día · hora' placeholder for null/incomplete slots", () => {
    expect(formatSlotBox(null)).toEqual({ text: "Día · hora", muted: true });
    const dayOnly: Slot = { scheduleId: 1, day: "L", start: null, end: null, classroomId: null };
    expect(formatSlotBox(dayOnly)).toEqual({ text: "Día · hora", muted: true });
  });
});

describe("formatSlotLabel", () => {
  it("formats a full slot", () => {
    const slot: Slot = { scheduleId: 1, day: "L", start: 540, end: 600, classroomId: null };
    expect(formatSlotLabel(slot)).toEqual({ text: "L 09:00 AM – 10:00 AM", muted: false });
  });
  it("formats null as the muted placeholder", () => {
    expect(formatSlotLabel(null)).toEqual({ text: "00:00 – 00:00", muted: true });
  });
  it("formats a slot missing start/end (no day) as the muted placeholder", () => {
    const slot: Slot = { scheduleId: null, day: null, start: null, end: null, classroomId: null };
    expect(formatSlotLabel(slot)).toEqual({ text: "00:00 – 00:00", muted: true });
  });
  it("prefixes the day on a legacy day-only row", () => {
    const slot: Slot = { scheduleId: 1, day: "L", start: null, end: null, classroomId: null };
    expect(formatSlotLabel(slot)).toEqual({ text: "L 00:00 – 00:00", muted: true });
  });
});

describe("defaultPeriodForHour", () => {
  it("7 -> PM", () => {
    expect(defaultPeriodForHour(7)).toBe("PM");
  });
  it("8 -> AM", () => {
    expect(defaultPeriodForHour(8)).toBe("AM");
  });
  it("11 -> AM", () => {
    expect(defaultPeriodForHour(11)).toBe("AM");
  });
  it("12 -> PM", () => {
    expect(defaultPeriodForHour(12)).toBe("PM");
  });
});

describe("defaultEndPeriod", () => {
  it("start 11:00 AM, end 1:00 -> PM", () => {
    const startMin = from12h(11, 0, "AM");
    expect(defaultEndPeriod(1, 0, startMin)).toBe("PM");
  });
  it("start 9:00 AM, end 10:00 -> AM", () => {
    const startMin = from12h(9, 0, "AM");
    expect(defaultEndPeriod(10, 0, startMin)).toBe("AM");
  });
  it("start 8:00 AM, end 12:00 -> PM", () => {
    const startMin = from12h(8, 0, "AM");
    expect(defaultEndPeriod(12, 0, startMin)).toBe("PM");
  });
  it("start 1:00 PM, end 2:00 -> PM", () => {
    const startMin = from12h(1, 0, "PM");
    expect(defaultEndPeriod(2, 0, startMin)).toBe("PM");
  });
  it("falls back to defaultPeriodForHour when startMin is null", () => {
    expect(defaultEndPeriod(9, 0, null)).toBe(defaultPeriodForHour(9));
    expect(defaultEndPeriod(2, 0, null)).toBe(defaultPeriodForHour(2));
  });
});

describe("validateRange", () => {
  it("reports a missing day first", () => {
    const result = validateRange({ day: null, start: null, end: null });
    expect(result).toEqual({ ok: false, error: "Falta el día" });
  });
  it("reports a missing start when day is present", () => {
    const result = validateRange({ day: "L", start: null, end: null });
    expect(result).toEqual({ ok: false, error: "Falta hora de inicio" });
  });
  it("accepts day and start without an end (open-ended horario)", () => {
    const result = validateRange({ day: "L", start: 540, end: null });
    expect(result).toEqual({ ok: true, value: { day: "L", start: 540, end: null } });
  });
  it("reports the end must be later when end is before start", () => {
    const result = validateRange({ day: "L", start: 660, end: 600 });
    expect(result).toEqual({ ok: false, error: "La hora de fin debe ser mayor" });
  });
  it("reports the end must be later when start and end are equal", () => {
    const result = validateRange({ day: "L", start: 540, end: 540 });
    expect(result).toEqual({ ok: false, error: "La hora de fin debe ser mayor" });
  });
  it("reports the minimum duration when the range is 29 minutes", () => {
    const result = validateRange({ day: "L", start: 540, end: 569 });
    expect(result).toEqual({ ok: false, error: "Duración mínima 30 min" });
  });
  it("accepts a 30 minute range and returns the value", () => {
    const result = validateRange({ day: "L", start: 540, end: 570 });
    expect(result).toEqual({ ok: true, value: { day: "L", start: 540, end: 570 } });
  });
  it("accepts two touching ranges as individually valid (11-12 then 12-13)", () => {
    // Touching horarios are allowed: each range is valid on its own, and the
    // aula sweep (conflicts.ts) treats a shared boundary as non-overlapping.
    expect(validateRange({ day: "L", start: 660, end: 720 })).toEqual({
      ok: true,
      value: { day: "L", start: 660, end: 720 },
    });
    expect(validateRange({ day: "L", start: 720, end: 780 })).toEqual({
      ok: true,
      value: { day: "L", start: 720, end: 780 },
    });
  });
  it("exposes the minimum duration constant used above", () => {
    expect(MIN_DURATION_MINUTES).toBe(30);
  });
});

describe("dayIndex", () => {
  it("returns the position of the day within DAY_ORDER", () => {
    expect(dayIndex("L")).toBe(0);
    expect(dayIndex("D")).toBe(6);
  });
});

describe("formatConflictRange", () => {
  it("formats a 24h range with an en dash and no spaces", () => {
    expect(formatConflictRange("L", 540, 600)).toBe("L 09:00–10:00");
  });
});

describe("formatSlotRange", () => {
  it("states the meridiem once when both ends share it", () => {
    expect(formatSlotRange(9 * 60, 9 * 60 + 40)).toBe("9:00 – 9:40 am");
  });

  it("states both when the range crosses noon", () => {
    expect(formatSlotRange(11 * 60 + 30, 12 * 60 + 10)).toBe("11:30 am – 12:10 pm");
  });

  it("falls back to the start alone when there is no end", () => {
    expect(formatSlotRange(15 * 60 + 5, null)).toBe("3:05 pm");
  });

  it("has nothing to state without a start", () => {
    expect(formatSlotRange(null, 10 * 60)).toBeNull();
  });
});
