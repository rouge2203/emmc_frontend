// Shared, React-light plumbing for the schedule grid's addressable sub-cells.
// Every sub-cell (the professor cell and each horario's time/aula cells) has a
// stable DOM id and a shared className so later tasks can scroll to, focus and
// highlight a cell by its CellAddress. Keyboard navigation (Task 9) resolves
// cells by these ids; editors/conflict badges (Tasks 10-11) reuse CellProps.
import type { ReactNode } from "react";
import type { CellAddress, ColKey, GridRow } from "./types";
import type { GridRefData } from "./useGridData";

/** Stable DOM id for one addressable sub-cell, e.g. `sg-42-t0`. */
export const cellDomId = (a: CellAddress): string => `sg-${a.enrollmentId}-${a.col}`;

/**
 * Shared className for a sub-cell. Adds the active ring + tint when this cell
 * is the selected one. Keyboard/editing tasks build on the same base so the
 * visual contract stays in one place.
 */
export const cellClass = (active: boolean): string =>
  `rounded-sm px-2 py-1 cursor-default select-none${
    active ? " ring-2 ring-primary ring-inset bg-primary/5" : ""
  }`;

/**
 * Props shared by every leaf cell component (ProfessorCell/TimeCell/AulaCell).
 * Kept intentionally small: Tasks 10-11 add optional `editing`/`saveState`
 * props here without changing GridRowView's contract. `refData` is optional so
 * a cell that doesn't need the reference lists can ignore it.
 */
export interface CellProps {
  row: GridRow;
  col: ColKey;
  active: boolean;
  onMouseDown: (address: CellAddress) => void;
  refData?: GridRefData;
}

/**
 * Optional per-cell render override for ScheduleGrid/GridRowView. Left as a
 * seam for later tasks to inject editing-aware cells without touching the
 * grid's structure; when omitted the built-in read-only cells are rendered.
 */
export type RenderCell = (params: {
  row: GridRow;
  col: ColKey;
  active: boolean;
  refData: GridRefData;
  onMouseDown: (address: CellAddress) => void;
}) => ReactNode;
