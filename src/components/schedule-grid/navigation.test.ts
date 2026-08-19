import { describe, expect, it } from "vitest";
import {
  arrowTarget,
  colIndexOf,
  gridEdgeTarget,
  pageTarget,
  PAGE_SIZE,
  rowEdgeTarget,
  rowIndexOf,
  tabTarget,
} from "./navigation";
import type { CellAddress, GridRow } from "./types";

// Minimal rows — navigation only reads enrollmentId.
const makeRows = (ids: number[]): GridRow[] =>
  ids.map((id) => ({ enrollmentId: id }) as GridRow);

const at = (enrollmentId: number, col: CellAddress["col"]): CellAddress => ({
  enrollmentId,
  col,
});

describe("colIndexOf / rowIndexOf", () => {
  it("maps columns to their COL_ORDER index", () => {
    expect(colIndexOf("prof")).toBe(0);
    expect(colIndexOf("t0")).toBe(1);
    expect(colIndexOf("t2")).toBe(3);
  });
  it("finds row indices and reports -1 when missing", () => {
    const rows = makeRows([10, 20, 30]);
    expect(rowIndexOf(rows, 20)).toBe(1);
    expect(rowIndexOf(rows, 99)).toBe(-1);
  });
});

describe("arrowTarget", () => {
  const rows = makeRows([1, 2, 3]);

  it("moves right/left within the row and clamps at the edges", () => {
    expect(arrowTarget(at(2, "prof"), "right", rows)).toEqual(at(2, "t0"));
    expect(arrowTarget(at(2, "t0"), "left", rows)).toEqual(at(2, "prof"));
    expect(arrowTarget(at(2, "prof"), "left", rows)).toEqual(at(2, "prof")); // clamp left
    expect(arrowTarget(at(2, "t2"), "right", rows)).toEqual(at(2, "t2")); // clamp right
  });

  it("moves down/up across rows keeping the col, clamping at top/bottom", () => {
    expect(arrowTarget(at(1, "t1"), "down", rows)).toEqual(at(2, "t1"));
    expect(arrowTarget(at(2, "t1"), "up", rows)).toEqual(at(1, "t1"));
    expect(arrowTarget(at(1, "t1"), "up", rows)).toEqual(at(1, "t1")); // clamp top
    expect(arrowTarget(at(3, "t1"), "down", rows)).toEqual(at(3, "t1")); // clamp bottom
  });

  it("returns null for 'none' or when the active row is gone", () => {
    expect(arrowTarget(at(2, "prof"), "none", rows)).toBeNull();
    expect(arrowTarget(at(99, "prof"), "down", rows)).toBeNull();
  });
});

describe("tabTarget", () => {
  const rows = makeRows([1, 2, 3]);

  it("advances through the columns then wraps to the next row's first col", () => {
    expect(tabTarget(at(1, "prof"), false, rows)).toEqual(at(1, "t0"));
    expect(tabTarget(at(1, "t2"), false, rows)).toEqual(at(2, "prof"));
  });

  it("retreats through the columns then wraps to the previous row's last col", () => {
    expect(tabTarget(at(2, "t0"), true, rows)).toEqual(at(2, "prof"));
    expect(tabTarget(at(2, "prof"), true, rows)).toEqual(at(1, "t2"));
  });

  it("returns null at the very last cell (fwd) and very first cell (back)", () => {
    expect(tabTarget(at(3, "t2"), false, rows)).toBeNull();
    expect(tabTarget(at(1, "prof"), true, rows)).toBeNull();
  });
});

describe("rowEdgeTarget / gridEdgeTarget", () => {
  const rows = makeRows([1, 2, 3]);
  it("jumps to the first/last col of the same row", () => {
    expect(rowEdgeTarget(at(2, "t1"), false)).toEqual(at(2, "prof"));
    expect(rowEdgeTarget(at(2, "t1"), true)).toEqual(at(2, "t2"));
  });
  it("jumps to the first/last visible row keeping the col", () => {
    expect(gridEdgeTarget(at(2, "t1"), false, rows)).toEqual(at(1, "t1"));
    expect(gridEdgeTarget(at(2, "t1"), true, rows)).toEqual(at(3, "t1"));
    expect(gridEdgeTarget(at(2, "t1"), true, [])).toBeNull();
  });
});

describe("pageTarget", () => {
  it("jumps PAGE_SIZE rows, clamped to the range", () => {
    const rows = makeRows(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(pageTarget(at(1, "prof"), true, rows)).toEqual(at(1 + PAGE_SIZE, "prof"));
    expect(pageTarget(at(20, "prof"), true, rows)).toEqual(at(35, "prof"));
    expect(pageTarget(at(38, "prof"), true, rows)).toEqual(at(40, "prof")); // clamp bottom
    expect(pageTarget(at(3, "prof"), false, rows)).toEqual(at(1, "prof")); // clamp top
  });
  it("returns null when the active row is gone", () => {
    expect(pageTarget(at(99, "prof"), true, makeRows([1, 2]))).toBeNull();
  });
});
