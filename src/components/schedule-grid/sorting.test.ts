import { describe, expect, it } from "vitest";
import {
  apiScheduleToSlot,
  buildSlots,
  hasAnySchedule,
  orderRows,
  toGridRow,
} from "./sorting";
import type { ApiEnrollment, ApiSchedule, GridRow, Slot } from "./types";

/** Minimal valid ApiSchedule with overridable fields. */
const makeSchedule = (overrides: Partial<ApiSchedule> = {}): ApiSchedule => ({
  id: 1,
  day: "L",
  hour: "09:00:00",
  end_hour: "10:00:00",
  classroom_id: null,
  ...overrides,
});

/** Minimal valid ApiEnrollment with overridable fields. */
const makeEnrollment = (overrides: Partial<ApiEnrollment> = {}): ApiEnrollment => ({
  id: 1,
  course: { id: 10, code: "MAT101", name: "Matemática", career_name: "Ingeniería" },
  assigned_course: null,
  student: { id: 100, first_name: "Ana", last_name: "Pérez" },
  student_full_name: "Pérez Ana",
  student_carnet: "C-1",
  professor: { id: 5, first_name: "Juan", last_name: "López" },
  professor_full_name: "López Juan",
  year: 2026,
  period: 1,
  period_display: "I Semestre 2026",
  status: "cursando",
  schedule_set: true,
  schedules: [],
  ...overrides,
});

/** Full GridRow with overridable fields, for orderRows/hasAnySchedule tests. */
const makeRow = (overrides: Partial<GridRow> = {}): GridRow => ({
  enrollmentId: 1,
  studentName: "Pérez Ana",
  studentFirst: "Ana",
  studentLast: "Pérez",
  carnet: "C-1",
  courseId: 10,
  courseCode: "MAT101",
  courseName: "Matemática",
  baseCourseCode: "MAT101",
  baseCourseName: "Matemática",
  careerName: "Ingeniería",
  year: 2026,
  period: 1,
  periodDisplay: "I Semestre 2026",
  professorId: 5,
  professorName: "López Juan",
  slots: [null, null, null],
  extraSchedules: [],
  notificationPending: false,
  ...overrides,
});

const emptySlot = (): Slot => ({
  scheduleId: null,
  day: null,
  start: null,
  end: null,
  classroomId: null,
});

describe("apiScheduleToSlot", () => {
  it("parses start/end times via parseApiTime", () => {
    const slot = apiScheduleToSlot(makeSchedule({ hour: "09:00:00", end_hour: "10:30:00" }));
    expect(slot.start).toBe(540);
    expect(slot.end).toBe(630);
  });

  it("casts a valid day code", () => {
    const slot = apiScheduleToSlot(makeSchedule({ day: "M" }));
    expect(slot.day).toBe("M");
  });

  it("maps an unknown day code to null", () => {
    const slot = apiScheduleToSlot(makeSchedule({ day: "X" }));
    expect(slot.day).toBeNull();
  });

  it("maps a missing classroom_id to null", () => {
    const slot = apiScheduleToSlot(makeSchedule({ classroom_id: null }));
    expect(slot.classroomId).toBeNull();
  });

  it("carries classroom_id through when present", () => {
    const slot = apiScheduleToSlot(makeSchedule({ classroom_id: 7 }));
    expect(slot.classroomId).toBe(7);
  });

  it("carries the schedule id through as scheduleId", () => {
    const slot = apiScheduleToSlot(makeSchedule({ id: 42 }));
    expect(slot.scheduleId).toBe(42);
  });
});

describe("buildSlots", () => {
  it("orders days by DAY_ORDER regardless of backend (alphabetical) order, overflow to extra", () => {
    // Backend alphabetical order: D, K, L, M. DAY_ORDER position: L=0, K=1, M=2, D=6.
    const schedules = [
      makeSchedule({ id: 1, day: "D", hour: "08:00:00", end_hour: "09:00:00" }),
      makeSchedule({ id: 2, day: "K", hour: "08:00:00", end_hour: "09:00:00" }),
      makeSchedule({ id: 3, day: "L", hour: "08:00:00", end_hour: "09:00:00" }),
      makeSchedule({ id: 4, day: "M", hour: "08:00:00", end_hour: "09:00:00" }),
    ];
    const { slots, extra } = buildSlots(schedules);
    expect(slots.map((s) => s?.day)).toEqual(["L", "K", "M"]);
    expect(extra).toHaveLength(1);
    expect(extra[0].day).toBe("D");
  });

  it("orders two schedules on the same day by start time", () => {
    const schedules = [
      makeSchedule({ id: 1, day: "L", hour: "10:00:00", end_hour: "11:00:00" }),
      makeSchedule({ id: 2, day: "L", hour: "08:00:00", end_hour: "09:00:00" }),
    ];
    const { slots } = buildSlots(schedules);
    expect(slots[0]?.scheduleId).toBe(2);
    expect(slots[1]?.scheduleId).toBe(1);
  });

  it("places a day-only (null start) schedule after timed ones on the same day", () => {
    const schedules = [
      makeSchedule({ id: 1, day: "L", hour: null, end_hour: null }),
      makeSchedule({ id: 2, day: "L", hour: "08:00:00", end_hour: "09:00:00" }),
    ];
    const { slots } = buildSlots(schedules);
    expect(slots[0]?.scheduleId).toBe(2);
    expect(slots[1]?.scheduleId).toBe(1);
  });

  it("breaks ties by id when day and start are equal", () => {
    const schedules = [
      makeSchedule({ id: 9, day: "L", hour: "08:00:00", end_hour: "09:00:00" }),
      makeSchedule({ id: 2, day: "L", hour: "08:00:00", end_hour: "09:00:00" }),
    ];
    const { slots } = buildSlots(schedules);
    expect(slots[0]?.scheduleId).toBe(2);
    expect(slots[1]?.scheduleId).toBe(9);
  });

  it("returns three nulls and no extras for null input", () => {
    const { slots, extra } = buildSlots(null);
    expect(slots).toEqual([null, null, null]);
    expect(extra).toEqual([]);
  });

  it("returns three nulls and no extras for undefined input", () => {
    const { slots, extra } = buildSlots(undefined);
    expect(slots).toEqual([null, null, null]);
    expect(extra).toEqual([]);
  });

  it("returns three nulls and no extras for an empty array", () => {
    const { slots, extra } = buildSlots([]);
    expect(slots).toEqual([null, null, null]);
    expect(extra).toEqual([]);
  });
});

describe("toGridRow", () => {
  it("prefers assigned_course for courseId/courseCode/courseName", () => {
    const row = toGridRow(
      makeEnrollment({
        course: { id: 10, code: "MAT101", name: "Matemática", career_name: "Ingeniería" },
        assigned_course: { id: 20, code: "MAT102", name: "Matemática Avanzada" },
      }),
    );
    expect(row.courseId).toBe(20);
    expect(row.courseCode).toBe("MAT102");
    expect(row.courseName).toBe("Matemática Avanzada");
  });

  it("keeps baseCourseCode/baseCourseName from course even when assigned_course is set", () => {
    const row = toGridRow(
      makeEnrollment({
        course: { id: 10, code: "MAT101", name: "Matemática", career_name: "Ingeniería" },
        assigned_course: { id: 20, code: "MAT102", name: "Matemática Avanzada" },
      }),
    );
    expect(row.baseCourseCode).toBe("MAT101");
    expect(row.baseCourseName).toBe("Matemática");
  });

  it("falls back to course when assigned_course is null", () => {
    const row = toGridRow(
      makeEnrollment({
        course: { id: 10, code: "MAT101", name: "Matemática", career_name: "Ingeniería" },
        assigned_course: null,
      }),
    );
    expect(row.courseId).toBe(10);
    expect(row.courseCode).toBe("MAT101");
    expect(row.courseName).toBe("Matemática");
  });

  it("maps student/carnet/career/professor fields", () => {
    const row = toGridRow(makeEnrollment());
    expect(row.studentFirst).toBe("Ana");
    expect(row.studentLast).toBe("Pérez");
    expect(row.studentName).toBe("Pérez Ana");
    expect(row.carnet).toBe("C-1");
    expect(row.careerName).toBe("Ingeniería");
    expect(row.professorId).toBe(5);
    expect(row.professorName).toBe("López Juan");
  });

  it("defaults notificationPending to false when schedule_notification_pending is undefined", () => {
    const row = toGridRow(makeEnrollment({ schedule_notification_pending: undefined }));
    expect(row.notificationPending).toBe(false);
  });

  it("sets notificationPending to true when schedule_notification_pending is true", () => {
    const row = toGridRow(makeEnrollment({ schedule_notification_pending: true }));
    expect(row.notificationPending).toBe(true);
  });

  it("maps a missing carnet to null", () => {
    const row = toGridRow(makeEnrollment({ student_carnet: null }));
    expect(row.carnet).toBeNull();
  });

  it("maps a missing career_name to null", () => {
    const row = toGridRow(
      makeEnrollment({
        course: { id: 10, code: "MAT101", name: "Matemática", career_name: null },
      }),
    );
    expect(row.careerName).toBeNull();
  });

  it("maps a null professor to professorId null (professorName from professor_full_name)", () => {
    const row = toGridRow(makeEnrollment({ professor: null, professor_full_name: null }));
    expect(row.professorId).toBeNull();
    expect(row.professorName).toBeNull();
  });

  it("builds slots/extraSchedules from schedules via buildSlots", () => {
    const row = toGridRow(
      makeEnrollment({
        schedules: [makeSchedule({ id: 1, day: "L" })],
      }),
    );
    expect(row.slots[0]?.day).toBe("L");
    expect(row.extraSchedules).toEqual([]);
  });
});

describe("hasAnySchedule", () => {
  it("is false when all slots are null and there are no extras", () => {
    expect(hasAnySchedule(makeRow({ slots: [null, null, null], extraSchedules: [] }))).toBe(false);
  });

  it("is true when any slot is non-null", () => {
    expect(
      hasAnySchedule(makeRow({ slots: [emptySlot(), null, null], extraSchedules: [] })),
    ).toBe(true);
  });

  it("is true when extraSchedules is non-empty even with all-null slots", () => {
    expect(
      hasAnySchedule(makeRow({ slots: [null, null, null], extraSchedules: [emptySlot()] })),
    ).toBe(true);
  });
});

describe("orderRows", () => {
  it("puts rows without any schedule before rows with a schedule", () => {
    const withSchedule = makeRow({
      enrollmentId: 1,
      studentName: "Aaa",
      slots: [emptySlot(), null, null],
    });
    const withoutSchedule = makeRow({
      enrollmentId: 2,
      studentName: "Zzz",
      slots: [null, null, null],
    });
    const result = orderRows([withSchedule, withoutSchedule]);
    expect(result.map((r) => r.enrollmentId)).toEqual([2, 1]);
  });

  it("orders each group by studentName using Spanish, case-insensitive collation", () => {
    const a = makeRow({ enrollmentId: 1, studentName: "Baez Carlos" });
    const b = makeRow({ enrollmentId: 2, studentName: "álvarez Marta" });
    const result = orderRows([a, b]);
    expect(result.map((r) => r.enrollmentId)).toEqual([2, 1]);
  });

  it("breaks studentName ties by enrollmentId ascending", () => {
    const a = makeRow({ enrollmentId: 9, studentName: "Same Name" });
    const b = makeRow({ enrollmentId: 2, studentName: "Same Name" });
    const result = orderRows([a, b]);
    expect(result.map((r) => r.enrollmentId)).toEqual([2, 9]);
  });

  it("does not mutate the input array", () => {
    const a = makeRow({ enrollmentId: 1, studentName: "Zzz" });
    const b = makeRow({ enrollmentId: 2, studentName: "Aaa" });
    const input = [a, b];
    const result = orderRows(input);
    expect(input).toEqual([a, b]);
    expect(result).not.toBe(input);
  });

  it("is deterministic across repeated calls on the same input (ordering is recomputed only at load, by calling this once)", () => {
    const rows = [
      makeRow({ enrollmentId: 1, studentName: "Zzz", slots: [null, null, null] }),
      makeRow({ enrollmentId: 2, studentName: "Aaa", slots: [emptySlot(), null, null] }),
      makeRow({ enrollmentId: 3, studentName: "Mmm", slots: [null, null, null] }),
    ];
    const first = orderRows(rows).map((r) => r.enrollmentId);
    const second = orderRows(rows).map((r) => r.enrollmentId);
    expect(second).toEqual(first);
  });
});
