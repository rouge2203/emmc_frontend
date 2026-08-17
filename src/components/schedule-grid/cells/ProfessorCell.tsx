// Read-only professor sub-cell. Renders the assigned professor's name, or a
// muted "Sin profesor" placeholder. Props follow the shared CellProps shape so
// Tasks 10-11 can add an `editing`/`saveState` prop without touching the
// parent (GridRowView) contract.
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";

export default function ProfessorCell({ row, col, active, onMouseDown }: CellProps) {
  return (
    <div
      id={cellDomId({ enrollmentId: row.enrollmentId, col })}
      role="gridcell"
      data-col={col}
      onMouseDown={() => onMouseDown({ enrollmentId: row.enrollmentId, col })}
      className={`${cellClass(active)} scroll-mt-10`}
    >
      {row.professorName ? (
        <span className="text-gray-900">{row.professorName}</span>
      ) : (
        <span className="text-gray-400 italic">Sin profesor</span>
      )}
    </div>
  );
}
