// Tiny per-cell autosave indicator, absolutely positioned at the cell's
// top-right (the cell wrapper is `relative`). The cell's error ring / saved
// flash come from cellClass; this renders the icon/dot overlay:
//   saving → spinner · saved → green check · error → red dot (title=message)
//   hint   → amber dot (title=message)
import { CheckIcon } from "@heroicons/react/16/solid";
import type { CellSaveState } from "../types";

export default function CellStatus({ state }: { state?: CellSaveState }) {
  if (!state || state.status === "idle") return null;

  if (state.status === "saving") {
    return (
      <span className="pointer-events-none absolute right-0.5 top-0.5">
        <span className="block size-3 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
      </span>
    );
  }

  if (state.status === "saved") {
    return (
      <span className="pointer-events-none absolute right-0.5 top-0.5 text-green-600">
        <CheckIcon className="size-3.5" aria-hidden="true" />
      </span>
    );
  }

  if (state.status === "error") {
    return (
      <span
        className="absolute right-0.5 top-0.5 block size-2 rounded-full bg-red-500"
        title={state.message}
      />
    );
  }

  // hint
  return (
    <span
      className="absolute right-0.5 top-0.5 block size-2 rounded-full bg-amber-400"
      title={state.message}
    />
  );
}
