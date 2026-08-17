import { describe, expect, it } from "vitest";
import {
  computeConflicts,
  describeConflict,
  isSameGroupClass,
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

describe("isSameGroupClass", () => {
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

  it("is true for identical course/professor/time/aula (forAula: true)", () => {
    expect(isSameGroupClass(base, { ...base, enrollmentId: 2 }, true)).toBe(true);
  });

  it("ignores aula when forAula is false", () => {
    const other: ScheduleRef = { ...base, enrollmentId: 2, classroomId: 99 };
    expect(isSameGroupClass(base, other, false)).toBe(true);
    expect(isSameGroupClass(base, other, true)).toBe(false);
  });

  it("is false when courseId differs", () => {
    expect(isSameGroupClass(base, { ...base, enrollmentId: 2, courseId: 2 }, false)).toBe(false);
  });

  it("is false when professorId differs", () => {
    expect(isSameGroupClass(base, { ...base, enrollmentId: 2, professorId: 11 }, false)).toBe(
      false,
    );
  });

  it("is false when start or end differ", () => {
    expect(isSameGroupClass(base, { ...base, enrollmentId: 2, start: 570 }, false)).toBe(false);
    expect(isSameGroupClass(base, { ...base, enrollmentId: 2, end: 630 }, false)).toBe(false);
  });
});

describe("computeConflicts", () => {
  it("does not conflict when two ranges only touch at the boundary (9-10 vs 10-11)", () => {
    const a = makeRow({
      enrollmentId: 1,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20,
      courseId: 2,
      slots: [makeSlot({ start: 600, end: 660, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("records a symmetric aula conflict at the right slot for both rows", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      courseId: 1,
      slots: [emptySlot(), makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20, // different professor, different course: only aula collides
      courseId: 2,
      slots: [makeSlot({ start: 570, end: 630, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);

    const aConflicts = index.get(1);
    expect(aConflicts).toBeDefined();
    expect(aConflicts?.slots[1]?.aula).toHaveLength(1);
    expect(aConflicts?.slots[1]?.aula[0]).toMatchObject({ enrollmentId: 2, slotIndex: 0 });
    expect(aConflicts?.slots[1]?.prof ?? []).toHaveLength(0);
    expect(aConflicts?.prof).toHaveLength(0);

    const bConflicts = index.get(2);
    expect(bConflicts).toBeDefined();
    expect(bConflicts?.slots[0]?.aula).toHaveLength(1);
    expect(bConflicts?.slots[0]?.aula[0]).toMatchObject({ enrollmentId: 1, slotIndex: 1 });
  });

  it("records a symmetric prof conflict and fills RowConflicts.prof for both rows", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      courseId: 1,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 10, // same professor
      courseId: 2, // different course: not a group class
      slots: [makeSlot({ start: 570, end: 630, classroomId: 9 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);

    const aConflicts = index.get(1);
    expect(aConflicts?.slots[0]?.prof).toHaveLength(1);
    expect(aConflicts?.slots[0]?.prof[0]).toMatchObject({ enrollmentId: 2, slotIndex: 0 });
    expect(aConflicts?.slots[0]?.aula ?? []).toHaveLength(0);
    expect(aConflicts?.prof).toHaveLength(1);
    expect(aConflicts?.prof[0]).toMatchObject({ enrollmentId: 2, slotIndex: 0 });

    const bConflicts = index.get(2);
    expect(bConflicts?.slots[0]?.prof).toHaveLength(1);
    expect(bConflicts?.prof).toHaveLength(1);
  });

  it("records both an aula and a prof conflict when both aula and professor collide", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      courseId: 1,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 10, // same professor
      courseId: 2, // different course
      slots: [makeSlot({ start: 570, end: 630, classroomId: 5 }), emptySlot(), emptySlot()], // same aula
    });
    const index = computeConflicts([a, b]);
    const aConflicts = index.get(1);
    expect(aConflicts?.slots[0]?.aula).toHaveLength(1);
    expect(aConflicts?.slots[0]?.prof).toHaveLength(1);
  });

  it("does not conflict for a group class: same course+professor+time+aula", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      courseId: 1,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 10,
      courseId: 1,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("does not flag prof for same course+professor+time in a different aula (aula not applicable)", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      courseId: 1,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 10,
      courseId: 1,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 9 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("does not conflict across different periods even with identical day/time/aula/prof", () => {
    const a = makeRow({
      enrollmentId: 1,
      period: 1,
      professorId: 10,
      courseId: 1,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      period: 2,
      professorId: 10,
      courseId: 2,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("skips overlapping slots within the same enrollment", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      courseId: 1,
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
      courseId: 1,
      slots: [makeSlot({ day: "L", start: null, end: null, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20,
      courseId: 2,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b]);
    expect(index.size).toBe(0);
  });

  it("only includes enrollments that actually have a conflict", () => {
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      courseId: 1,
      slots: [makeSlot({ start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const b = makeRow({
      enrollmentId: 2,
      professorId: 20,
      courseId: 2,
      slots: [makeSlot({ start: 570, end: 630, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const c = makeRow({
      enrollmentId: 3,
      professorId: 30,
      courseId: 3,
      slots: [makeSlot({ day: "M", start: 540, end: 600, classroomId: 5 }), emptySlot(), emptySlot()],
    });
    const index = computeConflicts([a, b, c]);
    expect(index.size).toBe(2);
    expect(index.has(1)).toBe(true);
    expect(index.has(2)).toBe(true);
    expect(index.has(3)).toBe(false);
  });

  it("dedupes RowConflicts.prof by the other side's enrollmentId+slotIndex while collecting all distinct other slots", () => {
    // Row B has a single slot (9-11) that overlaps BOTH of A's slots (9-9:30 and 10-10:30).
    const b = makeRow({
      enrollmentId: 2,
      professorId: 10,
      courseId: 99,
      slots: [makeSlot({ start: 540, end: 660, classroomId: null }), emptySlot(), emptySlot()],
    });
    const a = makeRow({
      enrollmentId: 1,
      professorId: 10,
      courseId: 1,
      slots: [
        makeSlot({ start: 540, end: 570, classroomId: null }),
        makeSlot({ start: 600, end: 630, classroomId: null }),
        emptySlot(),
      ],
    });
    const index = computeConflicts([a, b]);

    const aConflicts = index.get(1);
    // A's two own slots each individually conflict with B's single slot.
    expect(aConflicts?.slots[0]?.prof).toHaveLength(1);
    expect(aConflicts?.slots[1]?.prof).toHaveLength(1);
    // Both point at the SAME other ref (B, slotIndex 0): the union must dedupe it to one entry.
    expect(aConflicts?.prof).toHaveLength(1);
    expect(aConflicts?.prof[0]).toMatchObject({ enrollmentId: 2, slotIndex: 0 });

    const bConflicts = index.get(2);
    // B's single slot conflicts with two distinct slots of A: both must appear, not deduped.
    expect(bConflicts?.slots[0]?.prof).toHaveLength(2);
    expect(bConflicts?.prof).toHaveLength(2);
    const otherSlotIndices = bConflicts?.prof.map((r) => r.slotIndex).sort();
    expect(otherSlotIndices).toEqual([0, 1]);
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

  it("formats an aula conflict with the classroom label", () => {
    expect(describeConflict("aula", other, "Aula 3")).toBe(
      "Aula 3 ocupada: Pérez Juan · PIA-01 · L 09:00–10:00",
    );
  });

  it("falls back to 'Aula' when the classroom label is null", () => {
    expect(describeConflict("aula", other, null)).toBe(
      "Aula ocupada: Pérez Juan · PIA-01 · L 09:00–10:00",
    );
  });

  it("formats a prof conflict", () => {
    expect(describeConflict("prof", other, null)).toBe(
      "Profesor ocupado: Pérez Juan · PIA-01 · L 09:00–10:00",
    );
  });
});
