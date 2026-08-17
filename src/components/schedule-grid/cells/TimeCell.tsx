// Read-only time sub-cell (top half of a horario column). Shows the slot's
// "día HH:MM – HH:MM" label via formatSlotLabel, muted when empty/incomplete,
// plus the autosave CellStatus. Its editor arrives in Task 10; for now it only
// participates in navigation/selection.
import { formatSlotLabel } from "../time";
import { colSlotIndex } from "../types";
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";
import CellStatus from "./CellStatus";

export default function TimeCell({
  row,
  col,
  active,
  focused,
  saveState,
  onMouseDown,
  onDoubleClick,
}: CellProps) {
  const slot = row.slots[colSlotIndex(col)];
  const { text, muted } = formatSlotLabel(slot);
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
      <span className={`font-mono ${muted ? "text-gray-400" : "text-gray-900"}`}>{text}</span>
      <CellStatus state={saveState} />
    </div>
  );
}
