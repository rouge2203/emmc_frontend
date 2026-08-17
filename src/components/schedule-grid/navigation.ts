// Pure movement math for the excel-like grid's keyboard navigation. Kept
// React-free so the "where does the active cell go?" rules are unit tested
// directly (see navigation.test.ts). useGridNavigation.ts wires these into
// state, focus and DOM scrolling.
//
// Two families of movement:
//  - arrows clamp: they never leave the grid, they stop at the first/last
//    col (left/right) or the first/last visible row (up/down);
//  - Tab wraps: at a row's last col it jumps to the next row's first col, at
//    the first col it jumps to the previous row's last col, and it returns
//    null at the very first/last cell so focus can leave the grid naturally.
import { COL_ORDER } from "./types";
import type { CellAddress, ColKey, GridRow, MoveDir } from "./types";

/** PageUp/PageDown jump size, in rows. */
export const PAGE_SIZE = 15;

/** Index of a column within COL_ORDER (0..6). */
export const colIndexOf = (col: ColKey): number => COL_ORDER.indexOf(col);

/** Row index of an enrollmentId within the visible rows, or -1 when absent. */
export const rowIndexOf = (rows: GridRow[], enrollmentId: number): number =>
  rows.findIndex((r) => r.enrollmentId === enrollmentId);

const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

/**
 * Arrow-key move with clamping. Left/Right walk COL_ORDER inside the same row;
 * Up/Down walk the visible rows keeping the same col. The result never leaves
 * the grid — it is clamped to the edge. Returns null only when the active cell
 * is no longer among the visible rows (caller should reconcile) or when the
 * direction is "none".
 */
export function arrowTarget(
  active: CellAddress,
  dir: MoveDir,
  rows: GridRow[],
): CellAddress | null {
  if (dir === "none") return null;
  const rowIdx = rowIndexOf(rows, active.enrollmentId);
  if (rowIdx === -1) return null;

  if (dir === "left" || dir === "right") {
    const ci = colIndexOf(active.col);
    const next = clamp(ci + (dir === "right" ? 1 : -1), 0, COL_ORDER.length - 1);
    return { enrollmentId: active.enrollmentId, col: COL_ORDER[next] };
  }

  // up / down
  const next = clamp(rowIdx + (dir === "down" ? 1 : -1), 0, rows.length - 1);
  return { enrollmentId: rows[next].enrollmentId, col: active.col };
}

/**
 * Tab / Shift+Tab target. Walks COL_ORDER; at the last col ('a2') wraps to the
 * next row's first col ('prof'), at the first col ('prof') wraps to the
 * previous row's last col ('a2'). Returns null when it would leave the grid
 * (Tab on the very last cell, Shift+Tab on the very first) so focus can escape.
 */
export function tabTarget(
  active: CellAddress,
  backwards: boolean,
  rows: GridRow[],
): CellAddress | null {
  const rowIdx = rowIndexOf(rows, active.enrollmentId);
  if (rowIdx === -1) return null;
  const ci = colIndexOf(active.col);
  const last = COL_ORDER.length - 1;

  if (!backwards) {
    if (ci < last) return { enrollmentId: active.enrollmentId, col: COL_ORDER[ci + 1] };
    if (rowIdx < rows.length - 1) {
      return { enrollmentId: rows[rowIdx + 1].enrollmentId, col: COL_ORDER[0] };
    }
    return null; // last cell of the last row → leave the grid
  }

  if (ci > 0) return { enrollmentId: active.enrollmentId, col: COL_ORDER[ci - 1] };
  if (rowIdx > 0) {
    return { enrollmentId: rows[rowIdx - 1].enrollmentId, col: COL_ORDER[last] };
  }
  return null; // first cell of the first row → leave the grid
}

/** Home/End within a row: first ('prof') or last ('a2') col, same row. */
export function rowEdgeTarget(active: CellAddress, end: boolean): CellAddress {
  return {
    enrollmentId: active.enrollmentId,
    col: end ? COL_ORDER[COL_ORDER.length - 1] : COL_ORDER[0],
  };
}

/** Ctrl/Meta+Home/End: first/last visible row, same col. */
export function gridEdgeTarget(
  active: CellAddress,
  end: boolean,
  rows: GridRow[],
): CellAddress | null {
  if (rows.length === 0) return null;
  const row = end ? rows[rows.length - 1] : rows[0];
  return { enrollmentId: row.enrollmentId, col: active.col };
}

/** PageUp/PageDown: ±PAGE_SIZE rows, same col, clamped to the visible range. */
export function pageTarget(
  active: CellAddress,
  down: boolean,
  rows: GridRow[],
): CellAddress | null {
  const rowIdx = rowIndexOf(rows, active.enrollmentId);
  if (rowIdx === -1) return null;
  const next = clamp(rowIdx + (down ? PAGE_SIZE : -PAGE_SIZE), 0, rows.length - 1);
  return { enrollmentId: rows[next].enrollmentId, col: active.col };
}
