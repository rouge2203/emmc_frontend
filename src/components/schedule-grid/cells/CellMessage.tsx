// Visible message under a sub-cell for the two transient statuses that carry
// user-facing text: an "error" (e.g. a blur "No se guardó: …") and a "hint"
// (e.g. the aula "Primero asigne día y hora"). Rendered absolutely below the
// cell — the same treatment as the time editor's error line — so the message is
// legible as text, not only as a `title` tooltip on the corner dot. It shares
// the cell's autosave status object, so it auto-hides when that status clears.
import type { CellSaveState } from "../types";

export default function CellMessage({ state }: { state?: CellSaveState }) {
  if (!state || !state.message) return null;
  if (state.status !== "error" && state.status !== "hint") return null;
  const isError = state.status === "error";
  return (
    <div
      role="status"
      className={`pointer-events-none absolute left-0 top-full z-20 mt-0.5 max-w-[16rem] whitespace-normal rounded bg-white px-1.5 py-0.5 text-[11px] shadow ring-1 ${
        isError ? "text-red-600 ring-red-200" : "text-amber-700 ring-amber-200"
      }`}
    >
      {state.message}
    </div>
  );
}
