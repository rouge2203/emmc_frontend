import { describe, expect, it } from "vitest";
import { hasCrossedDragThreshold, nextHorizontalScrollLeft } from "./horizontalDrag";

describe("nextHorizontalScrollLeft", () => {
  it("moves the horizontal scroll by the inverse pointer distance", () => {
    expect(
      nextHorizontalScrollLeft(
        120,
        { x: 300, y: 80 },
        { x: 240, y: 80 },
      ),
    ).toBe(180);
  });

  it("ignores vertical pointer movement", () => {
    expect(
      nextHorizontalScrollLeft(
        90,
        { x: 200, y: 100 },
        { x: 200, y: 500 },
      ),
    ).toBe(90);
  });
});

describe("hasCrossedDragThreshold", () => {
  it("stays false for the jitter of an ordinary click, so the click still lands", () => {
    expect(hasCrossedDragThreshold({ x: 300, y: 80 }, { x: 302, y: 84 })).toBe(false);
  });

  it("turns true once the pointer travels horizontally", () => {
    expect(hasCrossedDragThreshold({ x: 300, y: 80 }, { x: 292, y: 80 })).toBe(true);
  });

  it("ignores vertical travel", () => {
    expect(hasCrossedDragThreshold({ x: 300, y: 80 }, { x: 300, y: 400 })).toBe(false);
  });
});
