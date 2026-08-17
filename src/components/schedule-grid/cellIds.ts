// Shared, React-light plumbing for the schedule grid's addressable sub-cells.
// Every sub-cell (the professor cell and each horario's time/aula cells) has a
// stable DOM id and a shared className so navigation/editing can scroll to,
// focus and highlight a cell by its CellAddress. Keyboard navigation (Task 9)
// resolves cells by these ids; editors/status badges reuse CellProps.
import type { ReactNode } from "react";
import type {
  CellAddress,
  CellSaveState,
  ColKey,
  GridRow,
  MoveDir,
  SaveStatus,
  SlotIndex,
  TimeRangeValue,
} from "./types";
import type { GridRefData } from "./useGridData";

/** Stable DOM id for one addressable sub-cell, e.g. `sg-42-t0`. */
export const cellDomId = (a: CellAddress): string => `sg-${a.enrollmentId}-${a.col}`;

/** Visual state inputs for a sub-cell wrapper. */
export interface CellVisual {
  active: boolean;
  /** Grid container has focus → primary ring; else the Excel-like gray inactive selection. */
  focused?: boolean;
  /** Transient autosave status (error → red ring, saved → green flash). */
  status?: SaveStatus;
}

/**
 * Shared className for a sub-cell wrapper. Owns the selection ring (focused vs
 * inactive) and the transient save styling; an error ring wins over the active
 * ring so a failed save is always visible. `relative` anchors the CellStatus
 * overlay; `scroll-mt-10` keeps the sticky header from covering it on scroll.
 */
export const cellClass = (v: CellVisual): string => {
  const parts = ["relative rounded-sm px-2 py-1 cursor-default select-none scroll-mt-10"];
  if (v.status === "error") {
    parts.push("ring-2 ring-red-500 ring-inset");
  } else if (v.active) {
    parts.push("ring-2 ring-inset", v.focused ? "ring-primary bg-primary/5" : "ring-gray-400");
  }
  if (v.status === "saved") parts.push("bg-green-50 transition-colors");
  return parts.join(" ");
};

/**
 * Props shared by every leaf cell component (ProfessorCell/TimeCell/AulaCell).
 * The navigation/editing fields are optional so a read-only render still works.
 */
export interface CellProps {
  row: GridRow;
  col: ColKey;
  active: boolean;
  /** Whether the grid container currently has focus (only meaningful when active). */
  focused?: boolean;
  /** This exact cell is in edit mode → mount its editor. */
  editing?: boolean;
  /** First typed char (Excel replace-typing) or null; only set while editing. */
  seed?: string | null;
  /** This cell's autosave status (spinner/check/error dot). */
  saveState?: CellSaveState;
  onMouseDown: (address: CellAddress) => void;
  onDoubleClick?: (address: CellAddress) => void;
  /** Commit a new professor for this row (professor cell only). */
  onCommitProfessor?: (enrollmentId: number, teacherId: number | null, move: MoveDir) => void;
  /** Commit a new day/time range for a horario slot (time cell only). */
  onCommitTime?: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    value: TimeRangeValue,
    move: MoveDir,
  ) => void;
  /** Leave a time cell without saving; an error paints a transient cell error (time cell only). */
  onCancelTime?: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    move: MoveDir,
    error?: string,
  ) => void;
  /** Commit (or clear, with null) a horario slot's classroom (aula cell only). */
  onCommitAula?: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    classroomId: number | null,
    move: MoveDir,
  ) => void;
  /** Leave edit mode without saving, optionally moving the active cell (professor/aula cells). */
  onCancelEdit?: (move: MoveDir) => void;
  refData?: GridRefData;
}

/**
 * Optional per-cell render override for ScheduleGrid/GridRowView — a seam for
 * injecting editing-aware cells without touching the grid's structure. When
 * omitted the built-in cells render.
 */
export type RenderCell = (props: CellProps) => ReactNode;
