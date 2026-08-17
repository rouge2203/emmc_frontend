// Tiny per-cell autosave indicator icon/dot. Rendered INLINE (positioning is
// owned by CellCorner, which places it in the absolute top-right flex row next
// to a possible ConflictBadge so the two never overlap):
//   saving → spinner · saved → green check · error → red dot (title=message)
//   hint   → amber dot (title=message)
// The cell's error ring / saved flash still come from cellClass.
import { CheckIcon } from "@heroicons/react/16/solid";
import type { CellSaveState } from "../types";

export default function CellStatus({ state }: { state?: CellSaveState }) {
  if (!state || state.status === "idle") return null;

  if (state.status === "saving") {
    return (
      <span className="pointer-events-none block size-3 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
    );
  }

  if (state.status === "saved") {
    return (
      <span className="pointer-events-none text-green-600">
        <CheckIcon className="size-3.5" aria-hidden="true" />
      </span>
    );
  }

  if (state.status === "error") {
    return <span className="block size-2 rounded-full bg-red-500" title={state.message} />;
  }

  // hint
  return <span className="block size-2 rounded-full bg-amber-400" title={state.message} />;
}
