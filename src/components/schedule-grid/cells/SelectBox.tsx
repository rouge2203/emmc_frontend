// Nav-mode presentation of an editable cell: a select-styled box (white,
// ring-1 ring-gray-300, rounded, chevron on the right) so a cell reads as a
// select even before it is opened. Any aula-conflict badge and the transient
// autosave status sit inline just left of the chevron so they never overlap it.
// Purely presentational — the surrounding gridcell owns focus, clicks and keys.
import ConflictBadge from "../ConflictBadge";
import CellStatus from "./CellStatus";
import type { CellSaveState } from "../types";

export default function SelectBox({
  text,
  muted,
  conflictLines,
  saveState,
}: {
  text: string;
  muted?: boolean;
  conflictLines?: string[];
  saveState?: CellSaveState;
}) {
  const hasConflict = !!conflictLines && conflictLines.length > 0;
  const hasStatus = !!saveState && saveState.status !== "idle";
  return (
    <div className="flex w-full items-center gap-1 rounded-md bg-white py-1 pl-2 pr-2 ring-1 ring-inset ring-gray-300">
      <span
        className={`min-w-0 flex-1 truncate text-sm ${muted ? "italic text-gray-400" : "text-gray-900"}`}
      >
        {text}
      </span>
      {(hasConflict || hasStatus) && (
        <span className="flex shrink-0 items-center gap-0.5">
          {hasConflict && <ConflictBadge lines={conflictLines} />}
          <CellStatus state={saveState} />
        </span>
      )}
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        className="pointer-events-none size-4 shrink-0 text-gray-500"
      >
        <path
          d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
          fillRule="evenodd"
        />
      </svg>
    </div>
  );
}
