// Read-only time sub-cell (top half of a horario column). Shows the slot's
// "día HH:MM – HH:MM" label via formatSlotLabel, muted when the slot is empty
// or incomplete. Props follow the shared CellProps shape so a time editor can
// be dropped in later (Task 10) without changing GridRowView.
import { formatSlotLabel } from "../time";
import { colSlotIndex } from "../types";
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";

export default function TimeCell({ row, col, active, onMouseDown }: CellProps) {
  const slot = row.slots[colSlotIndex(col)];
  const { text, muted } = formatSlotLabel(slot);
  return (
    <div
      id={cellDomId({ enrollmentId: row.enrollmentId, col })}
      role="gridcell"
      data-col={col}
      onMouseDown={() => onMouseDown({ enrollmentId: row.enrollmentId, col })}
      className={`${cellClass(active)} scroll-mt-10`}
    >
      <span className={`font-mono ${muted ? "text-gray-400" : "text-gray-900"}`}>{text}</span>
    </div>
  );
}
