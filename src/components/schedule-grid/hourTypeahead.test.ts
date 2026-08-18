import { describe, expect, it } from "vitest";
import { hourTypeahead } from "./hourTypeahead";

describe("hourTypeahead", () => {
  it("applies a fresh 2–9 immediately with no pending buffer", () => {
    expect(hourTypeahead("", "2")).toEqual({ hour: 2, buffer: "" });
    expect(hourTypeahead("", "9")).toEqual({ hour: 9, buffer: "" });
  });

  it("applies 1 now but keeps a buffer to complete 10/11/12", () => {
    expect(hourTypeahead("", "1")).toEqual({ hour: 1, buffer: "1" });
    expect(hourTypeahead("1", "0")).toEqual({ hour: 10, buffer: "" });
    expect(hourTypeahead("1", "1")).toEqual({ hour: 11, buffer: "" });
    expect(hourTypeahead("1", "2")).toEqual({ hour: 12, buffer: "" });
  });

  it("keeps the single hour 1 when the second digit can't make 10–12", () => {
    expect(hourTypeahead("1", "3")).toEqual({ hour: 1, buffer: "" });
    expect(hourTypeahead("1", "9")).toEqual({ hour: 1, buffer: "" });
  });

  it("treats a leading 0 as a wait, then a 1–9 as that hour", () => {
    expect(hourTypeahead("", "0")).toEqual({ hour: null, buffer: "0" });
    expect(hourTypeahead("0", "9")).toEqual({ hour: 9, buffer: "" });
    expect(hourTypeahead("0", "1")).toEqual({ hour: 1, buffer: "" });
    expect(hourTypeahead("0", "0")).toEqual({ hour: null, buffer: "" });
  });

  it("ignores non-digit input", () => {
    expect(hourTypeahead("", "a")).toEqual({ hour: null, buffer: "" });
    expect(hourTypeahead("1", "x")).toEqual({ hour: null, buffer: "" });
  });
});
