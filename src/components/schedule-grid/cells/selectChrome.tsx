// Shared chrome for the grid's native <select> editors (professor / aula / día).
// It mirrors the drawer's select markup and TimeSelect's chevron so every
// editable thing in the grid reads unmistakably as a select: appearance-none
// selects sit under an absolutely-overlaid chevron via a `grid grid-cols-1`
// shell. TimeSelect brings its own copy of this chevron for the hour/minute/
// AM-PM columns.
import type { ReactNode } from "react";

/** The inline chevron copied from TimeSelect/Calendar selects. Overlaid on a select via SelectShell. */
export function SelectChevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="pointer-events-none col-start-1 row-start-1 mr-1.5 size-4 self-center justify-self-end text-gray-500"
    >
      <path
        d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
        fillRule="evenodd"
      />
    </svg>
  );
}

/** Compact select styling shared by the professor/aula/día selects (matches the drawer + TimeSelect). */
export const SELECT_CLASS =
  "col-start-1 row-start-1 w-full min-w-0 appearance-none rounded-md bg-white py-1.5 pl-2 pr-6 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900";

/** Wraps a <select> so the SelectChevron overlays its right edge. */
export function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1">
      {children}
      <SelectChevron />
    </div>
  );
}
