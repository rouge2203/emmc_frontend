import { describe, expect, it } from "vitest";
import {
  computeConflicts,
  describeConflict,
  isAulaSharedAllowed,
  overlaps,
  type ScheduleRef,
} from "./conflicts";
import type { DayCode, GridRow, Slot } from "./types";

/** A slot with sensible overlap-testing defaults, day L 09:00–10:00. */
const makeSlot = (overrides: Partial<Slot> = {}): Slot => ({
  scheduleId: null,
  day: "L",
  start: 540,
  end: 600,
  classroomId: null,
  ...overrides,
});

const emptySlot = (): Slot => ({
  scheduleId: null,
  day: null,
  start: null,
  end: null,
  classroomId: null,
});

/** Full GridRow with overridable fields. */
const makeRow = (overrides: Partial<GridRow> = {}): GridRow => ({
  enrollmentId: 1,
  studentName: "Pérez Juan",
  studentFirst: "Juan",
  studentLast: "Pérez",
  carnet: null,
  courseId: 1,
  courseCode: "PIA-01",
  courseName: "Piano I",
  baseCourseCode: "PIA-01",
  baseCourseName: "Piano I",
  careerName: null,
  year: 2026,
  period: 1,
  periodDisplay: "I Semestre 2026",
  professorId: 10,
  professorName: "López María",
  slots: [emptySlot(), emptySlot(), emptySlot()],
  extraSchedules: [],
  notificationPending: false,
  ...overrides,
});

describe("overlaps", () => {
  it("is false when ranges only touch at the boundary", () => {
    expect(overlaps({ start: 540, end: 600 }, { start: 600, end: 660 })).toBe(false);
    expect(overlaps({ start: 600, end: 660 }, { start: 540, end: 600 })).toBe(false);
  });

  it("is true when ranges genuinely overlap", () => {
    expect(overlaps({ start: 540, end: 600 }, { start: 570, end: 630 })).toBe(true);
  });

  it("is true when one range contains the other", () => {
    expect(overlaps({ start: 540, end: 660 }, { start: 570, end: 600 })).toBe(true);
  });

  it("is false when ranges are disjoint", () => {
    expect(overlaps({ start: 540, end: 600 }, { start: 660, end: 720 })).toBe(false);
  });
});

describe("isAulaSharedAllowed", () => {
  const base: ScheduleRef = {
    enrollmentId: 1,
    slotIndex: 0,
    scheduleId: 1,
    year: 2026,
    period: 1,
    day: "L",
    start: 540,
    end: 600,
    classroomId: 5,
    professorId: 10,
    courseId: 1,
    studentName: "A",
    courseCode: "C1",
  };

  it("allows sharing when both sides have the same professor", () => {
    expect(isAulaSharedAllowed(base, { ...base, enrollmentId: 2, courseId: 9 })).toBe(true);
  });

  it("allows sharing when either professor is unassigned", () => {
    expect(isAulaSharedAllowed(base, { ...base, enrollmentId: 2, professorId: null })).toBe(true);
    expect(isAulaSharedAllowed({ ...base, professorId: null }, { ...base, enrollmentId: 2 })).toBe(
      true,
    );
  });

  it("does NOT allow sharing between two different, both-assigned professors", () => {
    expect(isAulaSharedAllowed(base, { ...base, enrollmentId: 2, professorId: 11 })).toBe(false);
  });
});

describe("computeConflicts", () => {
  it("does not conflict when two ranges only touch at the boundary (11-12 vs 12-13, same aula, different profs)", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      slots: [makeSlot({ start: 660, end: 720, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20,
      slots: [makeSlot({ start: 720, end: 780, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("records a symmetric aula conflict for two different professors in the same room at overlapping times", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      slots: [emptySlot(), makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20, // different professor
      slots: [makeSlot({ start: 570, end: 630, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);

    const aConflicts = index.get(1);
    expect(aConflicts).toBeDefined();
    expect(aConflicts?.slots[1]?.aula).toHaveLength(1);
    expect(aConflicts?.slots[1]?.aula[0]).toMatchObject({ enrollmentId: 2, slotIndex: 0 });

    const bConflicts = index.get(2);
    expect(bConflicts?.slots[0]?.aula).toHaveLength(1);
    expect(bConflicts?.slots[0]?.aula[0]).toMatchObject({ enrollmentId: 1, slotIndex: 1 });
  });

  it("does NOT flag an aula shared by the SAME professor (group class)", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 10, // same professor
      courseId: 2, // even a different course
      slots: [makeSlot({ start: 570, end: 630, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("does NOT flag an aula when either professor is unassigned", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: null,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20,
      slots: [makeSlot({ start: 570, end: 630, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("never flags a professor double-booking (same professor, overlapping, DIFFERENT aulas → nothing)", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 10,
      courseId: 2,
      slots: [makeSlot({ start: 570, end: 630, classroomId: 9 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("does not flag different aulas at the same time", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20,
      slots: [makeSlot({ start: 570, end: 630, classroomId: 6 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("does not conflict across different periods even with identical day/time/aula and different profs", () => {
    const a = makeRow({
      enrollmentId: 1,
      period: 1,
      professorId: 10,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      period: 2,
      professorId: 20,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("skips overlapping slots within the same enrollment", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      slots: [
        makeSlot({ start: 540, end: 600, classroomId: 5 }),
        makeSlot({ start: 570, end: 630, classroomId: 5 }),
        emptySlot(),
      ],
    });
    const index = computeConflicts([a]);
    expect(index.size).toBe(0);
  });

  it("ignores slots that are missing day/start/end", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      slots: [makeSlot({ day: "L", start: null, end: null, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("only includes enrollments that actually have a conflict", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20,
      slots: [makeSlot({ start: 570, end: 630, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const c = makeRow({
      enrollmentId: 3,
      professorId: 30,
      slots: [makeSlot({ day: "M", start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b, c]);
    expect(index.size).toBe(2);
    expect(index.has(1)).toBe(true);
    expect(index.has(2)).toBe(true);
    expect(index.has(3)).toBe(false);
  });
});

describe("describeConflict", () => {
  const other: ScheduleRef = {
    enrollmentId: 5,
    slotIndex: 0,
    scheduleId: 99,
    year: 2026,
    period: 1,
    day: "L" as DayCode,
    start: 540,
    end: 600,
    classroomId: 3,
    professorId: 7,
    courseId: 1,
    studentName: "Pérez Juan",
    courseCode: "PIA-01",
  };

  it("names the classroom and the occupying professor", () => {
    expect(describeConflict(other, "Aula 3", "López María")).toBe(
      "Aula 3 ocupada por López María: Pérez Juan · PIA-01 · L 09:00–10:00",
    );
  });

  it("falls back to 'Aula' and 'otro profesor' when labels are null", () => {
    expect(describeConflict(other, null, null)).toBe(
      "Aula ocupada por otro profesor: Pérez Juan · PIA-01 · L 09:00–10:00",
    );
  });
});
