// One grid row (memoized). Renders the read-only Info column plus the seven
// addressable sub-cells (professor + three horarios, each a stacked time/aula
// pair). Only the per-selection props (activeCol/editingCol/activeFocused) and
// this row's `statuses` object change when selection/saves move, so memo keeps
// every other row from re-rendering. All callbacks are stable (from the hooks),
// so they never break the memo. `renderCell` is an optional seam for editing-
// aware cells; when omitted the built-in cells render.
import { memo } from "react";
import type { ReactNode } from "react";
import { formatSlotLabel } from "./time";
import type {
  CellAddress,
  CellSaveState,
  ColKey,
  GridRow,
  MoveDir,
  SlotIndex,
  TimeRangeValue,
} from "./types";
import type { GridRefData } from "./useGridData";
import type { CellProps, RenderCell } from "./cellIds";
import ProfessorCell from "./cells/ProfessorCell";
import TimeCell from "./cells/TimeCell";
import AulaCell from "./cells/AulaCell";

export interface GridRowViewProps {
  row: GridRow;
  /** The active col on THIS row, or null when the active cell is elsewhere. */
  activeCol: ColKey | null;
  /** The col being edited on THIS row, or null. */
  editingCol: ColKey | null;
  /** Seed char for the editing cell (only meaningful when editingCol != null). */
  editSeed: string | null;
  /** Grid container focus state, forwarded to the active cell for its ring. */
  activeFocused: boolean;
  /** This row's autosave statuses, keyed by col. */
  statuses?: Partial<Record<ColKey, CellSaveState>>;
  refData: GridRefData;
  onCellMouseDown: (address: CellAddress) => void;
  onCellDoubleClick: (address: CellAddress) => void;
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
  renderCell?: RenderCell;
}

function GridRowViewInner({
  row,
  activeCol,
  editingCol,
  editSeed,
  activeFocused,
  statuses,
  refData,
  onCellMouseDown,
  onCellDoubleClick,
  onCommitProfessor,
  onCommitTime,
  onCancelTime,
  onCommitAula,
  onCancelEdit,
  renderCell,
}: GridRowViewProps) {
  const cellFor = (col: ColKey): ReactNode => {
    const editing = editingCol === col;
    const props: CellProps = {
      row,
      col,
      active: activeCol === col,
      focused: activeFocused,
      editing,
      seed: editing ? editSeed : null,
      saveState: statuses?.[col],
      onMouseDown: onCellMouseDown,
      onDoubleClick: onCellDoubleClick,
      onCommitProfessor,
      onCommitTime,
      onCancelTime,
      onCommitAula,
      onCancelEdit,
      refData,
    };
    if (renderCell) return renderCell(props);
    if (col === "prof") return <ProfessorCell {...props} />;
    if (col === "t0" || col === "t1" || col === "t2") return <TimeCell {...props} />;
    return <AulaCell {...props} />;
  };

  return (
    <tr>
      {/* Info */}
      <td className="align-top px-3 py-2 border-b border-gray-100 w-64">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-gray-900">{row.studentName}</div>
            <div className="text-xs text-gray-500">{row.carnet ?? "—"}</div>
            <div
              className="text-xs text-gray-600 truncate"
              title={`${row.courseCode} · ${row.courseName}`}
            >
              {row.courseCode} · {row.courseName}
            </div>
            <div className="text-xs text-gray-400">
              {row.year} · {row.periodDisplay}
            </div>
          </div>
          {/* Task 12: pending-notification icon slot */}
          <div className="shrink-0" />
        </div>
      </td>

      {/* Profesor */}
      <td className="align-top p-2 border-b border-gray-100 min-w-48">{cellFor("prof")}</td>

      {/* Horario 1..3 */}
      {[0, 1, 2].map((i) => {
        const timeCol = `t${i}` as ColKey;
        const aulaCol = `a${i}` as ColKey;
        return (
          <td key={i} className="align-top p-2 border-b border-gray-100 min-w-56">
            <div className="flex flex-col gap-1">
              {cellFor(timeCol)}
              {cellFor(aulaCol)}
              {i === 2 && row.extraSchedules.length > 0 && (
                <span
                  className="mt-0.5 inline-flex w-fit rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"
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
