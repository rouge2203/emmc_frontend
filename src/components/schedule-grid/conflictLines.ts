// Turns the pure conflict refs (from conflicts.ts) into the deduped, human
// tooltip lines the ConflictBadge shows. Kept out of conflicts.ts (which stays
// React/ref-data free and is unit tested on its own) because the aula and
// professor labels need the grid's classroom/teacher lookups.
import { describeConflict } from "./conflicts";
import type { SlotConflicts } from "./conflicts";
import type { Classroom, Teacher } from "./types";

const dedupe = (lines: string[]): string[] => Array.from(new Set(lines));

/**
 * Time-cell lines: aula double-bookings, labelled with the occupying
 * classroom's display name and the professor who holds it. Identical lines are
 * collapsed so two conflicts describing the same booking show once.
 */
export function slotConflictLines(
  slot: SlotConflicts | undefined,
  classroomById?: Map<number, Classroom>,
  teacherById?: Map<number, Teacher>,
): string[] {
  if (!slot) return [];
  const lines = slot.aula.map((other) => {
    const classroomLabel =
      other.classroomId !== null
        ? (classroomById?.get(other.classroomId)?.display_name ?? null)
        : null;
    const teacher = other.professorId !== null ? teacherById?.get(other.professorId) : undefined;
    const professorLabel = teacher ? `${teacher.last_name} ${teacher.first_name}`.trim() : null;
    return describeConflict(other, classroomLabel, professorLabel);
  });
  return dedupe(lines);
}
