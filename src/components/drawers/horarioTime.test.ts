import { describe, expect, it } from "vitest";
import {
  SCHOOL_HOUR24,
  addMinutes,
  aulaEnabled,
  canSaveHorario,
  composeHourMinute,
  endHourOptions,
  formatHourLabel,
  keepEditorFocusOnDisabledControl,
  parseHourMinute,
  periodOf,
  schoolHour24FromTypeahead,
} from "./horarioTime";

describe("SCHOOL_HOUR24", () => {
  it("runs from 7am through 9pm", () => {
    expect(SCHOOL_HOUR24[0]).toBe(7);
    expect(SCHOOL_HOUR24.at(-1)).toBe(21);
    expect(SCHOOL_HOUR24).toHaveLength(15);
  });
});

describe("formatHourLabel", () => {
  it("formats morning hours with am", () => {
    expect(formatHourLabel(7)).toBe("7am");
    expect(formatHourLabel(10)).toBe("10am");
    expect(formatHourLabel(11)).toBe("11am");
  });
  it("formats noon and afternoon with pm", () => {
    expect(formatHourLabel(12)).toBe("12pm");
    expect(formatHourLabel(13)).toBe("1pm");
    expect(formatHourLabel(21)).toBe("9pm");
  });
});

describe("periodOf", () => {
  it("returns am before noon and pm from noon on", () => {
    expect(periodOf(7)).toBe("am");
    expect(periodOf(11)).toBe("am");
    expect(periodOf(12)).toBe("pm");
    expect(periodOf(21)).toBe("pm");
  });
});

describe("parseHourMinute / composeHourMinute", () => {
  it("parses HH:MM and HH:MM:SS", () => {
    expect(parseHourMinute("10:00")).toEqual({ hour24: 10, minute: 0 });
    expect(parseHourMinute("09:40:00")).toEqual({ hour24: 9, minute: 40 });
  });
  it("returns null for empty values", () => {
    expect(parseHourMinute(null)).toBeNull();
    expect(parseHourMinute("")).toBeNull();
  });
  it("composes a zero-padded 24h time", () => {
    expect(composeHourMinute(7, 0)).toBe("07:00");
    expect(composeHourMinute(10, 40)).toBe("10:40");
  });
});

describe("addMinutes", () => {
  it("sets fin 40 minutes after inicio", () => {
    expect(addMinutes("10:00", 40)).toBe("10:40");
    expect(addMinutes("10:40", 40)).toBe("11:20");
    expect(addMinutes("07:00", 40)).toBe("07:40");
  });
  it("returns null when the result would pass 9:55pm", () => {
    expect(addMinutes("21:20", 40)).toBeNull();
  });
  it("keeps 9:00pm + 40 inside the school day", () => {
    expect(addMinutes("21:00", 40)).toBe("21:40");
  });
});

describe("endHourOptions", () => {
  it("hides hours before the selected inicio hour", () => {
    expect(endHourOptions(10)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    expect(endHourOptions(10)).not.toContain(7);
    expect(endHourOptions(10)).not.toContain(9);
  });
  it("returns the full school-day list when inicio has no hour yet", () => {
    expect(endHourOptions(null)).toEqual([...SCHOOL_HOUR24]);
  });
});

describe("aulaEnabled / canSaveHorario", () => {
  it("requires day and hora inicio", () => {
    expect(aulaEnabled("", "10:00")).toBe(false);
    expect(aulaEnabled("L", null)).toBe(false);
    expect(aulaEnabled("L", "")).toBe(false);
    expect(aulaEnabled("L", "10:00")).toBe(true);
  });
  it("treats day + hora inicio as the minimum to save", () => {
    expect(canSaveHorario("L", "07:00")).toBe(true);
    expect(canSaveHorario("L", "")).toBe(false);
    expect(canSaveHorario("", "07:00")).toBe(false);
  });
});

describe("schoolHour24FromTypeahead", () => {
  it("keeps school-day morning hours as-is", () => {
    expect(schoolHour24FromTypeahead(7)).toBe(7);
    expect(schoolHour24FromTypeahead(10)).toBe(10);
  });
  it("maps 1–6 onto afternoon 24h hours", () => {
    expect(schoolHour24FromTypeahead(1)).toBe(13);
    expect(schoolHour24FromTypeahead(6)).toBe(18);
  });
  it("keeps noon as 12", () => {
    expect(schoolHour24FromTypeahead(12)).toBe(12);
  });
});

describe("keepEditorFocusOnDisabledControl", () => {
  it("blocks pointer focus changes while Aula is disabled", () => {
    expect(keepEditorFocusOnDisabledControl(false)).toBe(true);
  });

  it("allows pointer focus changes once Aula is enabled", () => {
    expect(keepEditorFocusOnDisabledControl(true)).toBe(false);
  });
});
