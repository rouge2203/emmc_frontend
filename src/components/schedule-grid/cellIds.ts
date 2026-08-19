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
import type { SlotConflicts } from "./conflicts";
import type { GridRefData } from "./useGridData";
import type { HorarioEditorTarget } from "./horarioEditorTarget";

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
 * Shared className for a sub-cell wrapper. Selection is painted on the inner
 * control's own outline (see `controlBorder`), not as a second ring around the
 * cell. `relative` anchors CellMessage; `scroll-mt-10` keeps the sticky header
 * from covering the cell on scroll.
 */
export const cellClass = (v: CellVisual): string => {
  const parts = ["relative rounded-sm px-1 py-1 cursor-default select-none scroll-mt-10"];
  if (v.status === "saved") parts.push("bg-green-50 transition-colors");
  return parts.join(" ");
};

/** Outline sitting on the control's border (no outer ring). */
export const controlBorder = (v: {
  active?: boolean;
  focused?: boolean;
  error?: boolean;
}): string => {
  if (v.error) return "outline-2 -outline-offset-1 outline-red-500";
  if (v.active && v.focused) return "outline-2 -outline-offset-1 outline-primary";
  if (v.active) return "outline-2 -outline-offset-1 outline-gray-400";
  return "outline-1 -outline-offset-1 outline-gray-300";
};

/**
 * A settled cell shows text instead of controls, so there is no control border
 * to carry the selection. Paint it on the cell itself — but only when there is
 * something to say (selected, or a failed save); at rest it stays unadorned.
 */
export const settledCellOutline = (v: {
  active?: boolean;
  focused?: boolean;
  error?: boolean;
}): string => (v.error || v.active ? `rounded-md ${controlBorder(v)}` : "");

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
  /** Edit mode was entered by a mouse click → the editor opens its dropdown (showPicker). */
  viaMouse?: boolean;
  /** Nested horario control requested by a mouse click. */
  editTarget?: HorarioEditorTarget | null;
  /** This cell's autosave status (spinner/check/error dot). */
  saveState?: CellSaveState;
  onMouseDown: (address: CellAddress) => void;
  /** A click selects the cell and opens its editor (single-click-to-edit). */
  onClick?: (address: CellAddress, target?: HorarioEditorTarget) => void;
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
  /** This slot's aula double-bookings (time cells only) → time-cell ConflictBadge. */
  slotConflicts?: SlotConflicts;
  refData?: GridRefData;
}

/**
 * Optional per-cell render override for ScheduleGrid/GridRowView — a seam for
 * injecting editing-aware cells without touching the grid's structure. When
 * omitted the built-in cells render.
 */
export type RenderCell = (props: CellProps) => ReactNode;
