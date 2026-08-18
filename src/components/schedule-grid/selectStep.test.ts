import { describe, expect, it } from "vitest";
import { stepSelectIndex } from "./selectStep";

const none = (n: number): boolean[] => Array.from({ length: n }, () => false);

describe("stepSelectIndex", () => {
  it("steps forward and backward by one", () => {
    expect(stepSelectIndex(1, 1, none(4))).toBe(2);
    expect(stepSelectIndex(2, -1, none(4))).toBe(1);
  });

  it("clamps at the ends", () => {
    expect(stepSelectIndex(0, -1, none(4))).toBe(0);
    expect(stepSelectIndex(3, 1, none(4))).toBe(3);
  });

  it("skips disabled options", () => {
    // options: 0 ok, 1 disabled, 2 ok
    const disabled = [false, true, false];
    expect(stepSelectIndex(0, 1, disabled)).toBe(2);
    expect(stepSelectIndex(2, -1, disabled)).toBe(0);
  });

  it("clamps when the only options past the edge are disabled", () => {
    const disabled = [false, true, true];
    expect(stepSelectIndex(0, 1, disabled)).toBe(0);
  });

  it("lands on the first enabled option when nothing is selected yet", () => {
    expect(stepSelectIndex(-1, 1, none(3))).toBe(0);
    expect(stepSelectIndex(-1, -1, none(3))).toBe(0);
    expect(stepSelectIndex(-1, 1, [true, false, false])).toBe(1);
  });

  it("returns the current index when there is nowhere to move", () => {
    expect(stepSelectIndex(2, 1, none(3))).toBe(2);
    expect(stepSelectIndex(0, -1, none(3))).toBe(0);
    expect(stepSelectIndex(5, 1, [])).toBe(5);
    expect(stepSelectIndex(1, 1, [true, true, true])).toBe(1);
  });
});
