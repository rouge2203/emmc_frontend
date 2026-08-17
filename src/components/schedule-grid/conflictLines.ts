// Turns the pure conflict refs (from conflicts.ts) into the deduped, human
// tooltip lines the ConflictBadge shows. Kept out of conflicts.ts (which stays
// React/ref-data free and is unit tested on its own) because the aula label
// needs the grid's classroom lookup.
import { describeConflict } from "./conflicts";
import type { ScheduleRef, SlotConflicts } from "./conflicts";
import type { Classroom } from "./types";

const dedupe = (lines: string[]): string[] => Array.from(new Set(lines));

/**
 * Time-cell lines: aula double-bookings first (labelled with the occupying
 * classroom's display name), then professor overlaps. Identical lines are
 * collapsed so two conflicts describing the same booking show once.
 */
export function slotConflictLines(
  slot: SlotConflicts | undefined,
  classroomById?: Map<number, Classroom>,
): string[] {
  if (!slot) return [];
  const lines: string[] = [];
  for (const other of slot.aula) {
    const label =
      other.classroomId !== null
        ? (classroomById?.get(other.classroomId)?.display_name ?? null)
        : null;
    lines.push(describeConflict("aula", other, label));
  }
  for (const other of slot.prof) {
    lines.push(describeConflict("prof", other, null));
  }
  return dedupe(lines);
}

/** Professor-cell lines: the row's professor overlaps, deduped. */
export function profConflictLines(prof: ScheduleRef[] | undefined): string[] {
  if (!prof || prof.length === 0) return [];
  return dedupe(prof.map((other) => describeConflict("prof", other, null)));
}
