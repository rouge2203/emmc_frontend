// Turns the pure conflict refs (from conflicts.ts) into the deduped, human
// tooltip lines the ConflictBadge shows. Kept out of conflicts.ts (which stays
// React/ref-data free and is unit tested on its own) because the aula label
// needs the grid's classroom lookup.
import { describeConflict } from "./conflicts";
import type { SlotConflicts } from "./conflicts";
import type { Classroom } from "./types";

const dedupe = (lines: string[]): string[] => Array.from(new Set(lines));

/**
 * Time-cell lines: aula double-bookings, labelled with the occupying
 * classroom's display name. Identical lines are collapsed so two conflicts
 * describing the same booking show once.
 */
export function slotConflictLines(
  slot: SlotConflicts | undefined,
  classroomById?: Map<number, Classroom>,
): string[] {
  if (!slot) return [];
  const lines = slot.aula.map((other) => {
    const label =
      other.classroomId !== null
        ? (classroomById?.get(other.classroomId)?.display_name ?? null)
        : null;
    return describeConflict(other, label);
  });
  return dedupe(lines);
}
