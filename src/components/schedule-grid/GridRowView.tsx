// One grid row (memoized). Renders the read-only Info column plus the seven
// addressable sub-cells (professor + three horarios, each a stacked time/aula
// pair). Only `activeCol` changes when selection moves, so memo keeps every
// other row from re-rendering. `renderCell` is an optional seam for later tasks
// to swap in editing-aware cells; when omitted the built-in read-only cells
// render.
import { memo } from "react";
import type { ReactNode } from "react";
import { formatSlotLabel } from "./time";
import type { ColKey, GridRow } from "./types";
import type { CellAddress } from "./types";
import type { GridRefData } from "./useGridData";
import type { RenderCell } from "./cellIds";
import ProfessorCell from "./cells/ProfessorCell";
import TimeCell from "./cells/TimeCell";
import AulaCell from "./cells/AulaCell";

export interface GridRowViewProps {
  row: GridRow;
  activeCol: ColKey | null;
  refData: GridRefData;
  onCellMouseDown: (address: CellAddress) => void;
  renderCell?: RenderCell;
}

function GridRowViewInner({
  row,
  activeCol,
  refData,
  onCellMouseDown,
  renderCell,
}: GridRowViewProps) {
  const cellFor = (col: ColKey): ReactNode => {
    const active = activeCol === col;
    if (renderCell) return renderCell({ row, col, active, refData, onMouseDown: onCellMouseDown });
    const props = { row, col, active, onMouseDown: onCellMouseDown, refData };
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
