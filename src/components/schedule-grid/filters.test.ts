import { describe, expect, it } from "vitest";
import {
  buildSnapshot,
  EMPTY_FILTERS,
  filterRows,
  liveCounts,
  matchesSearch,
  normalize,
  type GridFilters,
} from "./filters";
import type { GridRow, Slot } from "./types";

/** Full GridRow with overridable fields. */
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

describe("normalize", () => {
  it("returns an empty string for null", () => {
    expect(normalize(null)).toBe("");
  });

  it("returns an empty string for undefined", () => {
    expect(normalize(undefined)).toBe("");
  });

  it("lowercases and trims", () => {
    expect(normalize("  MAT101  ")).toBe("mat101");
  });

  it("strips accents via NFD decomposition", () => {
    expect(normalize("Álvarez")).toBe("alvarez");
  });

  it("folds ñ to n, because NFD decomposes it into n + combining tilde", () => {
    // "Ñandú" -> NFD -> "N" + U+0303 (combining tilde) + "andú"; stripping
    // U+0300-U+036F removes the tilde, so "ñ" is indistinguishable from "n"
    // for search purposes. This is a deliberate, documented trade-off.
    expect(normalize("Ñandú")).toBe("nandu");
  });
});

describe("matchesSearch", () => {
  it("matches on empty query", () => {
    expect(matchesSearch(makeRow(), "")).toBe(true);
  });

  it("matches by carnet", () => {
    expect(matchesSearch(makeRow({ carnet: "C-1" }), "c-1")).toBe(true);
  });

  it("matches by course code (assigned/current)", () => {
    expect(matchesSearch(makeRow({ courseCode: "MAT102" }), "mat102")).toBe(true);
  });

  it("matches by base course code even when courseCode differs", () => {
    const row = makeRow({ baseCourseCode: "MAT101", courseCode: "MAT102" });
    expect(matchesSearch(row, "mat101")).toBe(true);
  });

  it("matches accent-insensitively on student name", () => {
    const row = makeRow({ studentFirst: "Ángel", studentLast: "Pérez" });
    expect(matchesSearch(row, "angel")).toBe(true);
  });

  it("matches 'Apellido Nombre' order", () => {
    const row = makeRow({ studentFirst: "Ana", studentLast: "Pérez" });
    expect(matchesSearch(row, "perez ana")).toBe(true);
  });

  it("matches 'Nombre Apellido' order", () => {
    const row = makeRow({ studentFirst: "Ana", studentLast: "Pérez" });
    expect(matchesSearch(row, "ana perez")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    const row = makeRow();
    expect(matchesSearch(row, "zzz-no-match")).toBe(false);
  });
});

describe("EMPTY_FILTERS", () => {
  it("has no active filters", () => {
    expect(EMPTY_FILTERS).toEqual({
      search: "",
      careerName: null,
      professorId: null,
      missingProfessor: false,
      missingSchedule: false,
    });
  });
});

describe("buildSnapshot", () => {
  it("captures rows with a null professorId", () => {
    const rows = [
      makeRow({ enrollmentId: 1, professorId: null }),
      makeRow({ enrollmentId: 2, professorId: 5 }),
    ];
    const snap = buildSnapshot(rows);
    expect(snap.professor.has(1)).toBe(true);
    expect(snap.professor.has(2)).toBe(false);
  });

  it("captures rows without any schedule", () => {
    const rows = [
      makeRow({ enrollmentId: 1, slots: [null, null, null], extraSchedules: [] }),
      makeRow({ enrollmentId: 2, slots: [emptySlot(), null, null] }),
    ];
    const snap = buildSnapshot(rows);
    expect(snap.schedule.has(1)).toBe(true);
    expect(snap.schedule.has(2)).toBe(false);
  });
});

describe("filterRows", () => {
  it("keeps a row visible under missingSchedule even after it gets a slot, per the load-time snapshot", () => {
    const original = makeRow({ enrollmentId: 1, slots: [null, null, null], extraSchedules: [] });
    const snap = buildSnapshot([original]);
    // Row now has a slot (simulating an in-progress assignment) but the
    // snapshot was captured before that happened.
    const updated = makeRow({ enrollmentId: 1, slots: [emptySlot(), null, null] });
    const filters: GridFilters = { ...EMPTY_FILTERS, missingSchedule: true };
    const result = filterRows([updated], filters, snap);
    expect(result).toEqual([updated]);
  });

  it("excludes a row under missingSchedule when it was never in the snapshot", () => {
    const rows = [makeRow({ enrollmentId: 1, slots: [emptySlot(), null, null] })];
    const snap = buildSnapshot(rows);
    const filters: GridFilters = { ...EMPTY_FILTERS, missingSchedule: true };
    expect(filterRows(rows, filters, snap)).toEqual([]);
  });

  it("keeps a row visible under missingProfessor even after it gets a professor assigned", () => {
    const original = makeRow({ enrollmentId: 1, professorId: null });
    const snap = buildSnapshot([original]);
    const updated = makeRow({ enrollmentId: 1, professorId: 5 });
    const filters: GridFilters = { ...EMPTY_FILTERS, missingProfessor: true };
    expect(filterRows([updated], filters, snap)).toEqual([updated]);
  });

  it("filters by careerName", () => {
    const rows = [
      makeRow({ enrollmentId: 1, careerName: "Ingeniería" }),
      makeRow({ enrollmentId: 2, careerName: "Medicina" }),
    ];
    const snap = buildSnapshot(rows);
    const filters: GridFilters = { ...EMPTY_FILTERS, careerName: "Medicina" };
    expect(filterRows(rows, filters, snap).map((r) => r.enrollmentId)).toEqual([2]);
  });

  it("filters by professorId", () => {
    const rows = [
      makeRow({ enrollmentId: 1, professorId: 5 }),
      makeRow({ enrollmentId: 2, professorId: 6 }),
    ];
    const snap = buildSnapshot(rows);
    const filters: GridFilters = { ...EMPTY_FILTERS, professorId: 6 };
    expect(filterRows(rows, filters, snap).map((r) => r.enrollmentId)).toEqual([2]);
  });

  it("filters by search text", () => {
    const rows = [
      makeRow({ enrollmentId: 1, studentFirst: "Ana", studentLast: "Pérez" }),
      makeRow({ enrollmentId: 2, studentFirst: "Luis", studentLast: "Gómez" }),
    ];
    const snap = buildSnapshot(rows);
    const filters: GridFilters = { ...EMPTY_FILTERS, search: "gomez" };
    expect(filterRows(rows, filters, snap).map((r) => r.enrollmentId)).toEqual([2]);
  });

  it("ANDs all active filters together", () => {
    const rows = [
      makeRow({ enrollmentId: 1, careerName: "Ingeniería", professorId: null }),
      makeRow({ enrollmentId: 2, careerName: "Ingeniería", professorId: 5 }),
      makeRow({ enrollmentId: 3, careerName: "Medicina", professorId: null }),
    ];
    const snap = buildSnapshot(rows);
    const filters: GridFilters = {
      ...EMPTY_FILTERS,
      careerName: "Ingeniería",
      missingProfessor: true,
    };
    expect(filterRows(rows, filters, snap).map((r) => r.enrollmentId)).toEqual([1]);
  });

  it("preserves input order", () => {
    const rows = [
      makeRow({ enrollmentId: 3 }),
      makeRow({ enrollmentId: 1 }),
      makeRow({ enrollmentId: 2 }),
    ];
    const snap = buildSnapshot(rows);
    expect(filterRows(rows, EMPTY_FILTERS, snap).map((r) => r.enrollmentId)).toEqual([3, 1, 2]);
  });
});

describe("liveCounts", () => {
  it("counts current rows missing a professor and missing a schedule, not the snapshot", () => {
    const original = [
      makeRow({ enrollmentId: 1, professorId: null, slots: [null, null, null] }),
      makeRow({ enrollmentId: 2, professorId: null, slots: [emptySlot(), null, null] }),
    ];
    // Row 1 gets fixed up after load; liveCounts should reflect the new
    // state, unlike the snapshot which stays frozen at load time.
    const updated = [
      makeRow({ enrollmentId: 1, professorId: 5, slots: [emptySlot(), null, null] }),
      makeRow({ enrollmentId: 2, professorId: null, slots: [emptySlot(), null, null] }),
    ];
    expect(liveCounts(original)).toEqual({ missingProfessor: 2, missingSchedule: 1 });
    expect(liveCounts(updated)).toEqual({ missingProfessor: 1, missingSchedule: 0 });
  });
});
