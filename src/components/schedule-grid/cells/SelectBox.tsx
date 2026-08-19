// Nav-mode presentation of an editable cell, in two faces:
//   - settled (a value is assigned): plain text. A filled-in cell should recede
//     so the empty ones are what catch the eye down a 300-row grid.
//   - empty: a select-styled box (white, rounded, chevron on the right) so the
//     cell reads as a select even before it is opened. Its padding and type
//     scale match SELECT_CLASS exactly, so opening the editor swaps one 32px
//     control for another without a reflow.
// Any aula-conflict badge and the transient autosave status sit inline on the
// right of either face. Purely presentational — the gridcell owns focus,
// clicks and keys.
import ConflictBadge from "../ConflictBadge";
import CellStatus from "./CellStatus";
import { controlBorder } from "../cellIds";
import type { CellSaveState } from "../types";

export default function SelectBox({
  text,
  muted,
  settled,
  conflictLines,
  saveState,
  active,
  focused,
}: {
  text: string;
  muted?: boolean;
  /** A value is assigned → render as text, without the select chrome. */
  settled?: boolean;
  conflictLines?: string[];
  saveState?: CellSaveState;
  active?: boolean;
  focused?: boolean;
}) {
  const hasConflict = !!conflictLines && conflictLines.length > 0;
  const hasStatus = !!saveState && saveState.status !== "idle";
  const trailing = (hasConflict || hasStatus) && (
    <span className="flex shrink-0 items-center gap-0.5">
      {hasConflict && <ConflictBadge lines={conflictLines} />}
      <CellStatus state={saveState} />
    </span>
  );

  if (settled) {
    return (
      <div className="flex w-full items-center gap-1 py-1.5 pl-2 pr-2">
        <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{text}</span>
        {trailing}
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-center gap-1 rounded-md bg-white py-1.5 pl-2 pr-2 ${controlBorder({
        active,
        focused,
        error: saveState?.status === "error",
      })}`}
    >
      <span
        className={`min-w-0 flex-1 truncate text-sm ${muted ? "italic text-gray-400" : "text-gray-900"}`}
      >
        {text}
      </span>
      {trailing}
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
