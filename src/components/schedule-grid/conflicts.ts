// Pure conflict-detection for the schedule grid. Kept React-free (like
// time.ts/sorting.ts/filters.ts) so it is unit tested directly.
//
// Conflicts only WARN (never block a save): an aula double-booked or a
// professor booked twice at overlapping times. All rows for a year/period
// are loaded client-side, so the whole grid is re-swept in one pure pass
// (see computeConflicts) and the caller re-runs it in a useMemo after every
// optimistic save.
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

export interface SlotConflicts {
  aula: ScheduleRef[];
  prof: ScheduleRef[];
}

export interface RowConflicts {
  slots: Partial<Record<0 | 1 | 2, SlotConflicts>>;
  /**
   * Union (deduped by the other side's enrollmentId+slotIndex) of every
   * slot's prof conflicts — drives the single Profesor-cell icon, since a
   * professor is assigned per-enrollment, not per-slot.
   */
  prof: ScheduleRef[];
}

export type ConflictIndex = Map<number /* enrollmentId */, RowConflicts>;

/** True when two [start, end) ranges genuinely overlap; touching ends do NOT overlap. */
export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * True when `a` and `b` are the same group class occurrence: same course,
 * same professor, same time. When `forAula` is true, the aula must match
 * too (used to exempt group classes sharing one room from an aula
 * conflict; professor conflicts ignore the aula entirely).
 */
export function isSameGroupClass(a: ScheduleRef, b: ScheduleRef, forAula: boolean): boolean {
  return (
    a.courseId === b.courseId &&
    a.professorId === b.professorId &&
    a.start === b.start &&
    a.end === b.end &&
    (!forAula || a.classroomId === b.classroomId)
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
    row = { slots: {}, prof: [] };
    index.set(enrollmentId, row);
  }
  return row;
};

const getOrCreateSlot = (row: RowConflicts, slotIndex: number): SlotConflicts => {
  const key = slotIndex as 0 | 1 | 2;
  let slot = row.slots[key];
  if (!slot) {
    slot = { aula: [], prof: [] };
    row.slots[key] = slot;
  }
  return slot;
};

const addConflict = (index: ConflictIndex, kind: "aula" | "prof", ref: ScheduleRef, other: ScheduleRef): void => {
  const row = getOrCreateRow(index, ref.enrollmentId);
  const slot = getOrCreateSlot(row, ref.slotIndex);
  slot[kind].push(other);
  if (kind === "prof") {
    const alreadyPresent = row.prof.some(
      (p) => p.enrollmentId === other.enrollmentId && p.slotIndex === other.slotIndex,
    );
    if (!alreadyPresent) row.prof.push(other);
  }
};

/**
 * Sweeps every row's t0/t1/t2 slots for aula and professor double-bookings.
 * Groups refs by `${year}|${period}|${day}`, sorts each group by start, and
 * for each ref scans forward while the next ref's start is still before the
 * current ref's end (a classic interval-overlap sweep). O(n log n + k) where
 * k is the number of conflicting pairs. Only enrollments with at least one
 * conflict appear in the returned map.
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
          !isSameGroupClass(a, b, true)
        ) {
          addConflict(index, "aula", a, b);
          addConflict(index, "aula", b, a);
        }

        if (
          a.professorId !== null &&
          b.professorId !== null &&
          a.professorId === b.professorId &&
          !isSameGroupClass(a, b, false)
        ) {
          addConflict(index, "prof", a, b);
          addConflict(index, "prof", b, a);
        }
      }
    }
  }

  return index;
}

/** Describes a conflict for a tooltip/icon, e.g. "Aula 3 ocupada: Pérez Juan · PIA-01 · L 09:00–10:00". */
export function describeConflict(
  kind: "aula" | "prof",
  other: ScheduleRef,
  classroomLabel: string | null,
): string {
  const range = formatConflictRange(other.day, other.start, other.end);
  const who = `${other.studentName} · ${other.courseCode} · ${range}`;
  if (kind === "aula") {
    return `${classroomLabel ?? "Aula"} ocupada: ${who}`;
  }
  return `Profesor ocupado: ${who}`;
}
