// Non-blocking conflict warning: a small amber triangle shown at a sub-cell's
// top-right when an aula is double-booked or a professor is booked twice at
// overlapping times. Purely informative — it never blocks a save. The `title`
// (native tooltip) lists the conflicting bookings, one per line, so the badge
// stays hoverable (do NOT set pointer-events:none, or the tooltip is lost).
import { ExclamationTriangleIcon } from "@heroicons/react/16/solid";

/** `lines` are the already-described, deduped conflict descriptions (>= 1). */
export default function ConflictBadge({ lines }: { lines: string[] }) {
  return (
    <span
      role="img"
      aria-label="Conflicto de horario"
      title={lines.join("\n")}
      className="flex items-center"
    >
      <ExclamationTriangleIcon className="size-3.5 text-amber-500" aria-hidden="true" />
    </span>
  );
}
