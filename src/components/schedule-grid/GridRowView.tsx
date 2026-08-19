// One grid row (memoized). Renders the read-only Info column, the professor
// cell, and three horario cards (día + aula + clocks). Only the per-selection
// props (activeCol/editingCol/activeFocused) and this row's `statuses` object
// change when selection/saves move, so memo keeps every other row from
// re-rendering. All callbacks are stable (from the hooks), so they never break
// the memo. `renderCell` is an optional seam for injecting editing-aware cells.
import { memo } from "react";
import type { ReactNode } from "react";
import { EnvelopeIcon } from "@heroicons/react/16/solid";
import { formatSlotLabel } from "./time";
import {
  colSlotIndex,
  type CellAddress,
  type CellSaveState,
  type ColKey,
  type GridRow,
  type MoveDir,
  type SlotIndex,
  type TimeRangeValue,
} from "./types";
import type { RowConflicts } from "./conflicts";
import type { GridRefData } from "./useGridData";
import type { CellProps, RenderCell } from "./cellIds";
import ProfessorCell from "./cells/ProfessorCell";
import HorarioSlotCell from "./cells/HorarioSlotCell";
import { formatGridRowCourseSummary } from "./rowInfo";
import type { HorarioEditorTarget } from "./horarioEditorTarget";

export interface GridRowViewProps {
  row: GridRow;
  /** The active col on THIS row, or null when the active cell is elsewhere. */
  activeCol: ColKey | null;
  /** The col being edited on THIS row, or null. */
  editingCol: ColKey | null;
  /** Seed char for the editing cell (only meaningful when editingCol != null). */
  editSeed: string | null;
  /** Whether the editing cell was opened by a mouse click (→ showPicker). */
  editViaMouse: boolean;
  /** Nested horario control requested by the click that opened the editor. */
  editTarget: HorarioEditorTarget | null;
  /** Grid container focus state, forwarded to the active cell for its ring. */
  activeFocused: boolean;
  /** This row's autosave statuses, keyed by col. */
  statuses?: Partial<Record<ColKey, CellSaveState>>;
  /**
   * This row's schedule conflicts (undefined for the vast majority of rows).
   * `computeConflicts` returns a fresh object only for conflicting rows, so
   * this stays reference-stable per row → the memo keeps holding.
   */
  conflicts?: RowConflicts;
  refData: GridRefData;
  onCellMouseDown: (address: CellAddress) => void;
  onCellClick: (address: CellAddress, target?: HorarioEditorTarget) => void;
  onCommitProfessor: (enrollmentId: number, teacherId: number | null, move: MoveDir) => void;
  onCommitTime: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    value: TimeRangeValue,
    move: MoveDir,
  ) => void;
  onCancelTime: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    move: MoveDir,
    error?: string,
  ) => void;
  onCommitAula: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    classroomId: number | null,
    move: MoveDir,
  ) => void;
  onCancelEdit: (move: MoveDir) => void;
  onRequestDeleteSlot?: (enrollmentId: number, slotIndex: SlotIndex) => void;
  renderCell?: RenderCell;
}

function GridRowViewInner({
  row,
  activeCol,
  editingCol,
  editSeed,
  editViaMouse,
  editTarget,
  activeFocused,
  statuses,
  conflicts,
  refData,
  onCellMouseDown,
  onCellClick,
  onCommitProfessor,
  onCommitTime,
  onCancelTime,
  onCommitAula,
  onCancelEdit,
  onRequestDeleteSlot,
  renderCell,
}: GridRowViewProps) {
  const cellFor = (
    col: ColKey,
    override?: Partial<Pick<CellProps, "editing" | "active" | "saveState">>,
  ): ReactNode => {
    const editing = override?.editing ?? editingCol === col;
    const isSlot = col !== "prof";
    const props: CellProps = {
      row,
      col,
      active: override?.active ?? activeCol === col,
      focused: activeFocused,
      editing,
      seed: editing ? editSeed : null,
      viaMouse: editing ? editViaMouse : false,
      editTarget: editing ? editTarget : null,
      saveState: override?.saveState ?? statuses?.[col],
      onMouseDown: onCellMouseDown,
      onClick: onCellClick,
      onCommitProfessor,
      onCommitTime,
      onCancelTime,
      onCommitAula,
      onCancelEdit,
      slotConflicts: isSlot ? conflicts?.slots[colSlotIndex(col)] : undefined,
      refData,
    };
    if (renderCell) return renderCell(props);
    if (col === "prof") return <ProfessorCell {...props} />;
    return (
      <HorarioSlotCell
        {...props}
        onRequestDelete={() => onRequestDeleteSlot?.(row.enrollmentId, colSlotIndex(col))}
      />
    );
  };

  const infoLine = formatGridRowCourseSummary(row);

  return (
    <tr>
      <td className="align-top px-3 py-2 border-b border-gray-100 w-64">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-gray-900">{row.studentName}</div>
            <div className="text-xs text-gray-600 truncate" title={infoLine}>
              {infoLine}
            </div>
          </div>
          <div className="shrink-0">
            {row.notificationPending && (
              <span title="Pendiente de notificar">
                <EnvelopeIcon className="size-3.5 text-amber-500" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="align-top p-2 border-b border-gray-100 min-w-48">{cellFor("prof")}</td>

      {[0, 1, 2].map((i) => {
        const timeCol = `t${i}` as ColKey;
        const aulaCol = `a${i}` as ColKey;
        const slotEditing = editingCol === timeCol || editingCol === aulaCol;
        const slotActive = activeCol === timeCol || activeCol === aulaCol;
        const visualCol = activeCol === aulaCol ? aulaCol : timeCol;
        const timeStatus = statuses?.[timeCol];
        const aulaStatus = statuses?.[aulaCol];
        const saveState =
          timeStatus?.status === "error"
            ? timeStatus
            : aulaStatus?.status === "error"
              ? aulaStatus
              : activeCol === aulaCol
                ? aulaStatus
                : timeStatus;
        return (
          <td key={i} className="w-104 min-w-104 align-top border-b border-gray-100 p-2">
            <div className="flex flex-col gap-1">
              {cellFor(visualCol, {
                editing: slotEditing,
                active: slotActive,
                saveState,
              })}
              {i === 2 && row.extraSchedules.length > 0 && (
                <span
                  className="ml-1 inline-flex w-fit items-center rounded-full bg-gray-100 px-1.5 text-[10px] text-gray-600"
                  title={row.extraSchedules.map((s) => formatSlotLabel(s).text).join("\n")}
                >
                  +{row.extraSchedules.length} más
                </span>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

const GridRowView = memo(GridRowViewInner);
export default GridRowView;
