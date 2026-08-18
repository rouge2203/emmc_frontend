// Time sub-cell (top half of a horario column). Nav mode: a select-styled box
// with the slot's "L · 9:00 AM – 10:00 AM" label (muted "Día · hora" when
// empty/incomplete), plus any aula-conflict badge and the autosave status. Edit
// mode: the Día + start/end TimeSelect editor; navigation and autosave stay in
// the page/hooks via the row's commit/cancel callbacks.
import { formatSlotBox } from "../time";
import { colSlotIndex } from "../types";
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";
import { slotConflictLines } from "../conflictLines";
import SelectBox from "./SelectBox";
import CellMessage from "./CellMessage";
import TimeRangeSelects from "./TimeRangeSelects";

export default function TimeCell({
  row,
  col,
  active,
  focused,
  editing,
  seed,
  viaMouse,
  saveState,
  onMouseDown,
  onClick,
  onCommitTime,
  onCancelTime,
  slotConflicts,
  refData,
}: CellProps) {
  const slotIndex = colSlotIndex(col);
  const slot = row.slots[slotIndex];
  const { text, muted } = formatSlotBox(slot);
  const address = { enrollmentId: row.enrollmentId, col };
  const conflictLines = slotConflictLines(
    slotConflicts,
    refData?.classroomById,
    refData?.teacherById,
  );
  return (
    <div
      id={cellDomId(address)}
      role="gridcell"
      data-col={col}
      onMouseDown={editing ? undefined : () => onMouseDown(address)}
      onClick={editing ? undefined : () => onClick?.(address)}
      className={cellClass({ active, focused, status: saveState?.status })}
    >
      {editing ? (
        <TimeRangeSelects
          initial={slot ? { day: slot.day, start: slot.start, end: slot.end } : null}
          seed={seed ?? null}
          viaMouse={!!viaMouse}
          onCommit={(value, move) => onCommitTime?.(row.enrollmentId, slotIndex, value, move)}
          onCancel={(move, error) => onCancelTime?.(row.enrollmentId, slotIndex, move, error)}
        />
      ) : (
        <>
          <SelectBox text={text} muted={muted} conflictLines={conflictLines} saveState={saveState} />
          <CellMessage state={saveState} />
        </>
      )}
    </div>
  );
}
