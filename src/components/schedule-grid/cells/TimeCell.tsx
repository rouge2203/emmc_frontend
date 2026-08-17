// Time sub-cell (top half of a horario column). Nav mode: the slot's
// "día HH:MM – HH:MM" label via formatSlotLabel, muted when empty/incomplete,
// plus the autosave CellStatus. Edit mode: mounts the segmented TimeRangeEditor,
// wiring the row's commit/cancel callbacks so navigation and autosave stay in
// the page/hooks.
import { formatSlotLabel } from "../time";
import { colSlotIndex } from "../types";
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";
import CellStatus from "./CellStatus";
import TimeRangeEditor from "./TimeRangeEditor";

export default function TimeCell({
  row,
  col,
  active,
  focused,
  editing,
  seed,
  saveState,
  onMouseDown,
  onDoubleClick,
  onCommitTime,
  onCancelTime,
}: CellProps) {
  const slotIndex = colSlotIndex(col);
  const slot = row.slots[slotIndex];
  const { text, muted } = formatSlotLabel(slot);
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
      {editing ? (
        <TimeRangeEditor
          initial={slot ? { day: slot.day, start: slot.start, end: slot.end } : null}
          seed={seed ?? null}
          onCommit={(value, move) => onCommitTime?.(row.enrollmentId, slotIndex, value, move)}
          onCancel={(move, error) => onCancelTime?.(row.enrollmentId, slotIndex, move, error)}
        />
      ) : (
        <>
          <span className={`font-mono ${muted ? "text-gray-400" : "text-gray-900"}`}>{text}</span>
          <CellStatus state={saveState} />
        </>
      )}
    </div>
  );
}
