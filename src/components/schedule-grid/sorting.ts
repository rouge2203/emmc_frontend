// Pure ordering helpers for the schedule grid. Keep this module React-free —
// it is unit tested directly. Row order is computed ONCE at load time (see
// GridFilters/MissingSnapshot in filters.ts for why): the grid must not
// reshuffle rows while an admin is mid-assignment, only on the next reload.
import { dayIndex, parseApiTime } from "./time";
import {
  DAY_ORDER,
  type ApiEnrollment,
  type ApiSchedule,
  type DayCode,
  type GridRow,
  type Slot,
} from "./types";

const isDayCode = (d: string): d is DayCode => (DAY_ORDER as readonly string[]).includes(d);

/** Maps one Course_Enrollment_Schedule API row into a grid Slot. */
export const apiScheduleToSlot = (s: ApiSchedule): Slot => ({
  scheduleId: s.id,
  day: isDayCode(s.day) ? s.day : null,
  start: parseApiTime(s.hour),
  end: parseApiTime(s.end_hour),
  classroomId: s.classroom_id ?? null,
});

/**
 * Splits an enrollment's schedules into the first 3 (shown as columns) and
 * any extras (shown as read-only "+N más"). Sorted by day (DAY_ORDER
 * position; a null/unknown day sorts last), then by start time (a null/
 * day-only start sorts after any timed slot on the same day), then by id.
 */
export const buildSlots = (
  schedules: ApiSchedule[] | null | undefined,
): { slots: [Slot | null, Slot | null, Slot | null]; extra: Slot[] } => {
  const sorted = (schedules ?? [])
    .map(apiScheduleToSlot)
    .sort((a, b) => {
      const dayA = a.day ? dayIndex(a.day) : Infinity;
      const dayB = b.day ? dayIndex(b.day) : Infinity;
      if (dayA !== dayB) return dayA - dayB;
      const startA = a.start ?? Infinity;
      const startB = b.start ?? Infinity;
      if (startA !== startB) return startA - startB;
      return (a.scheduleId ?? 0) - (b.scheduleId ?? 0);
    });
  const [s0, s1, s2, ...extra] = sorted;
  return { slots: [s0 ?? null, s1 ?? null, s2 ?? null], extra };
};

/** Maps one manage-enrollments API row into a GridRow. */
export const toGridRow = (e: ApiEnrollment): GridRow => {
  const { slots, extra } = buildSlots(e.schedules);
  return {
    enrollmentId: e.id,
    studentName: e.student_full_name,
    studentFirst: e.student.first_name,
    studentLast: e.student.last_name,
    carnet: e.student_carnet ?? null,
    courseId: e.assigned_course?.id ?? e.course.id,
    courseCode: e.assigned_course?.code ?? e.course.code,
    courseName: e.assigned_course?.name ?? e.course.name,
    baseCourseCode: e.course.code,
    baseCourseName: e.course.name,
    careerName: e.course.career_name ?? null,
    year: e.year,
    period: e.period,
    periodDisplay: e.period_display,
    professorId: e.professor?.id ?? null,
    professorName: e.professor_full_name ?? null,
    slots,
    extraSchedules: extra,
    notificationPending: !!e.schedule_notification_pending,
  };
};

/** True when a row has at least one horario, in a slot column or beyond. */
export const hasAnySchedule = (row: GridRow): boolean =>
  row.slots.some((s) => s !== null) || row.extraSchedules.length > 0;

/**
 * Orders rows for display: rows with no horario at all come first, then the
 * rest; within each group, rows are ordered by student name (Spanish,
 * case/accent-insensitive collation), tie-broken by enrollmentId ascending.
 * Returns a new array — the input is never mutated. The caller is expected
 * to call this exactly once, at load time (see module doc comment above).
 */
export const orderRows = (rows: GridRow[]): GridRow[] =>
  [...rows].sort((a, b) => {
    const groupA = hasAnySchedule(a) ? 1 : 0;
    const groupB = hasAnySchedule(b) ? 1 : 0;
    if (groupA !== groupB) return groupA - groupB;
    const byName = a.studentName.localeCompare(b.studentName, "es", { sensitivity: "base" });
    if (byName !== 0) return byName;
    return a.enrollmentId - b.enrollmentId;
  });
