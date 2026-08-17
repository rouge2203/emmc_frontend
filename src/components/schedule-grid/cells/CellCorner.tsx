// The absolute top-right corner of a sub-cell: a small flex row that holds an
// optional ConflictBadge (amber warning) to the left of the autosave CellStatus
// so the two never overlap. Renders nothing when there is neither a conflict
// nor a live save status. Kept hoverable (no pointer-events:none) so the badge
// and error/hint dots still show their native `title` tooltips.
import ConflictBadge from "../ConflictBadge";
import CellStatus from "./CellStatus";
import type { CellSaveState } from "../types";

export default function CellCorner({
  saveState,
  conflictLines,
}: {
  saveState?: CellSaveState;
  conflictLines?: string[];
}) {
  const hasConflict = !!conflictLines && conflictLines.length > 0;
  const hasStatus = !!saveState && saveState.status !== "idle";
  if (!hasConflict && !hasStatus) return null;
  return (
    <span className="absolute right-0.5 top-0.5 flex items-center gap-0.5">
      {hasConflict && <ConflictBadge lines={conflictLines} />}
      <CellStatus state={saveState} />
    </span>
  );
}
