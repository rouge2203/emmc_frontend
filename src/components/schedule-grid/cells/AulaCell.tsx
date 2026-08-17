// Read-only aula sub-cell (bottom half of a horario column). Resolves the
// slot's classroom id against refData.classroomById and shows its display_name,
// falling back to a muted "Aula" when there is no slot or no classroom. Props
// follow the shared CellProps shape so an aula picker can be added later
// (Task 10) without changing GridRowView.
import { colSlotIndex } from "../types";
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";

export default function AulaCell({ row, col, active, onMouseDown, refData }: CellProps) {
  const slot = row.slots[colSlotIndex(col)];
  const classroom =
    slot && slot.classroomId !== null ? refData?.classroomById.get(slot.classroomId) : undefined;
  const label = classroom?.display_name ?? "Aula";
  const muted = !classroom;
  return (
    <div
      id={cellDomId({ enrollmentId: row.enrollmentId, col })}
      role="gridcell"
      data-col={col}
      onMouseDown={() => onMouseDown({ enrollmentId: row.enrollmentId, col })}
      className={`${cellClass(active)} scroll-mt-10`}
    >
      <span className={`text-xs ${muted ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
    </div>
  );
}
