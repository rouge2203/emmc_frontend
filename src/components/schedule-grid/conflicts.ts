// Pure conflict-detection for the schedule grid. Kept React-free (like
// time.ts/sorting.ts/filters.ts) so it is unit tested directly.
//
// Only ONE kind of conflict is flagged, and it only WARNS (it never blocks a
// save): an aula booked by TWO DIFFERENT professors at overlapping times on the
// same day. Two students of the SAME professor may share a room at the same
// time (a group class), and an unassigned professor never warns — so the aula
// warning fires only when both sides have a professor and the professors
// differ. Professor double-booking is intentionally NOT a conflict: different
// students may have the same professor at the same time.
//
// All rows for a year/period are loaded client-side, so the whole grid is
// re-swept in one pure pass (see computeConflicts) and the caller re-runs it in
// a useMemo after every optimistic save.
import { formatConflictRange } from "./time";
import type { DayCode, GridRow } from "./types";

/** One flattened slot (t0/t1/t2 only — extraSchedules are never compared). */
export interface ScheduleRef {
  enrollmentId: number;
  slotIndex: number;
  scheduleId: number | null;
  year: number;
  period: number;
  day: DayCode;
  start: number;
  end: number;
  classroomId: number | null;
  professorId: number | null;
  courseId: number;
  studentName: string;
  courseCode: string;
}

/** Per-slot conflicts — only the aula (classroom) kind survives. */
export interface SlotConflicts {
  aula: ScheduleRef[];
}

export interface RowConflicts {
  slots: Partial<Record<0 | 1 | 2, SlotConflicts>>;
}

export type ConflictIndex = Map<number /* enrollmentId */, RowConflicts>;

/** True when two [start, end) ranges genuinely overlap; touching ends do NOT overlap. */
export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * True when `a` and `b` are the same aula booking that should NOT warn: the
 * classrooms match AND either a professor is unassigned or both sides share the
 * same professor. Only two DIFFERENT, both-assigned professors in one room at
 * overlapping times is a conflict.
 */
export function isAulaSharedAllowed(a: ScheduleRef, b: ScheduleRef): boolean {
  return (
    a.professorId === null ||
    b.professorId === null ||
    a.professorId === b.professorId
  );
}

const SLOT_INDICES = [0, 1, 2] as const;

/** Flattens every complete (day+start+end) t0/t1/t2 slot across all rows into ScheduleRefs. */
const flatten = (rows: GridRow[]): ScheduleRef[] => {
  const refs: ScheduleRef[] = [];
  for (const row of rows) {
    for (const slotIndex of SLOT_INDICES) {
      const slot = row.slots[slotIndex];
      if (!slot || !slot.day || slot.start === null || slot.end === null) continue;
      refs.push({
        enrollmentId: row.enrollmentId,
        slotIndex,
        scheduleId: slot.scheduleId,
        year: row.year,
        period: row.period,
        day: slot.day,
        start: slot.start,
        end: slot.end,
        classroomId: slot.classroomId,
        professorId: row.professorId,
        courseId: row.courseId,
        studentName: row.studentName,
        courseCode: row.courseCode,
      });
    }
  }
  return refs;
};

const getOrCreateRow = (index: ConflictIndex, enrollmentId: number): RowConflicts => {
  let row = index.get(enrollmentId);
  if (!row) {
    row = { slots: {} };
    index.set(enrollmentId, row);
  }
  return row;
};

const getOrCreateSlot = (row: RowConflicts, slotIndex: number): SlotConflicts => {
  const key = slotIndex as 0 | 1 | 2;
  let slot = row.slots[key];
  if (!slot) {
    slot = { aula: [] };
    row.slots[key] = slot;
  }
  return slot;
};

const addAulaConflict = (index: ConflictIndex, ref: ScheduleRef, other: ScheduleRef): void => {
  const row = getOrCreateRow(index, ref.enrollmentId);
  getOrCreateSlot(row, ref.slotIndex).aula.push(other);
};

/**
 * Sweeps every row's t0/t1/t2 slots for aula double-bookings by two different
 * professors. Groups refs by `${year}|${period}|${day}`, sorts each group by
 * start, and for each ref scans forward while the next ref's start is still
 * before the current ref's end (a classic interval-overlap sweep). O(n log n +
 * k) where k is the number of conflicting pairs. Only enrollments with at least
 * one conflict appear in the returned map.
 */
export function computeConflicts(rows: GridRow[]): ConflictIndex {
  const refs = flatten(rows);

  const groups = new Map<string, ScheduleRef[]>();
  for (const ref of refs) {
    const key = `${ref.year}|${ref.period}|${ref.day}`;
    const group = groups.get(key);
    if (group) {
      group.push(ref);
    } else {
      groups.set(key, [ref]);
    }
  }

  const index: ConflictIndex = new Map();

  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        if (b.start >= a.end) break;
        if (a.enrollmentId === b.enrollmentId) continue;

        if (
          a.classroomId !== null &&
          b.classroomId !== null &&
          a.classroomId === b.classroomId &&
          !isAulaSharedAllowed(a, b)
        ) {
          addAulaConflict(index, a, b);
          addAulaConflict(index, b, a);
        }
      }
    }
  }

  return index;
}

/**
 * Describes an aula conflict for a tooltip, naming the professor who holds the
 * room, e.g. "Aula 3 ocupada por López María: Pérez Juan · PIA-01 · L 09:00–10:00".
 * Falls back to "otro profesor" when the professor's name is unknown.
 */
export function describeConflict(
  other: ScheduleRef,
  classroomLabel: string | null,
  professorLabel: string | null,
): string {
  const range = formatConflictRange(other.day, other.start, other.end);
  const who = `${other.studentName} · ${other.courseCode} · ${range}`;
  return `${classroomLabel ?? "Aula"} ocupada por ${professorLabel ?? "otro profesor"}: ${who}`;
}
