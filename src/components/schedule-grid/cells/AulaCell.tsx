// Read-only aula sub-cell (bottom half of a horario column). Resolves the
// slot's classroom id against refData.classroomById and shows its display_name,
// falling back to a muted "Aula" when there is no slot or classroom, plus the
// autosave CellStatus. Its picker arrives in Task 10; for now it only
// participates in navigation/selection.
import { colSlotIndex } from "../types";
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";
import CellStatus from "./CellStatus";

export default function AulaCell({
  row,
  col,
  active,
  focused,
  saveState,
  onMouseDown,
  onDoubleClick,
  refData,
}: CellProps) {
  const slot = row.slots[colSlotIndex(col)];
  const classroom =
    slot && slot.classroomId !== null ? refData?.classroomById.get(slot.classroomId) : undefined;
  const label = classroom?.display_name ?? "Aula";
  const muted = !classroom;
  const address = { enrollmentId: row.enrollmentId, col };
  return (
    <div
      id={cellDomId(address)}
      role="gridcell"
      data-col={col}
      onMouseDown={() => onMouseDown(address)}
      onDoubleClick={() => onDoubleClick?.(address)}
      className={cellClass({ active, focused, status: saveState?.status })}
    >
      <span className={`text-xs ${muted ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
      <CellStatus state={saveState} />
    </div>
  );
}
