// Aula sub-cell (bottom half of a horario column). Nav mode: resolves the
// slot's classroom id against refData.classroomById and shows its display_name,
// falling back to a muted "Aula" when there is no slot or classroom, plus the
// autosave CellStatus. Edit mode: mounts AulaEditor (a numeric-first combobox),
// wiring the row's commit/cancel callbacks so navigation and autosave stay in
// the page/hooks.
import { colSlotIndex } from "../types";
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";
import CellStatus from "./CellStatus";
import AulaEditor from "./AulaEditor";

export default function AulaCell({
  row,
  col,
  active,
  focused,
  editing,
  seed,
  saveState,
  onMouseDown,
  onDoubleClick,
  onCommitAula,
  onCancelEdit,
  refData,
}: CellProps) {
  const slotIndex = colSlotIndex(col);
  const slot = row.slots[slotIndex];
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
      onMouseDown={editing ? undefined : () => onMouseDown(address)}
      onDoubleClick={editing ? undefined : () => onDoubleClick?.(address)}
      className={cellClass({ active, focused, status: saveState?.status })}
    >
      {editing && refData ? (
        <AulaEditor
          current={slot?.classroomId ?? null}
          classrooms={refData.classrooms}
          seed={seed ?? null}
          onCommit={(classroomId, move) =>
            onCommitAula?.(row.enrollmentId, slotIndex, classroomId, move)
          }
          onCancel={(move) => onCancelEdit?.(move)}
        />
      ) : (
        <>
          <span className={`text-xs ${muted ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
          <CellStatus state={saveState} />
        </>
      )}
    </div>
  );
}
