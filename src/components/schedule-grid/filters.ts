// Pure client-side search/filter helpers for the schedule grid. Keep this
// module React-free — it is unit tested directly.
//
// The grid loads every `cursando` enrollment for a year/period at once and
// filters client-side. The "Sin profesor" / "Sin horario" toggles must not
// make a row vanish mid-edit: their membership is decided from a snapshot
// captured once at load time (see MissingSnapshot/buildSnapshot), while the
// counts shown next to those toggles stay live (see liveCounts).
import { hasAnySchedule } from "./sorting";
import type { GridRow } from "./types";

/** NFD-decomposes, strips combining diacritics, lowercases and trims. */
export const normalize = (s: string | null | undefined): string =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * True when the normalized query is a substring of any searchable field on
 * the row: first/last name (both orders), carnet, or either the base or
 * currently-assigned course code/name. An empty query always matches.
 */
export const matchesSearch = (row: GridRow, query: string): boolean => {
  const q = normalize(query);
  if (q === "") return true;
  const candidates = [
    row.studentFirst,
    row.studentLast,
    `${row.studentFirst} ${row.studentLast}`,
    `${row.studentLast} ${row.studentFirst}`,
    row.carnet,
    row.baseCourseCode,
    row.baseCourseName,
    row.courseCode,
    row.courseName,
  ];
  return candidates.some((c) => normalize(c).includes(q));
};

export interface GridFilters {
  search: string;
  careerName: string | null;
  professorId: number | null;
  missingProfessor: boolean;
  missingSchedule: boolean;
}

export const EMPTY_FILTERS: GridFilters = {
  search: "",
  careerName: null,
  professorId: null,
  missingProfessor: false,
  missingSchedule: false,
};

/** enrollmentIds captured at load time, before any in-session edits. */
export interface MissingSnapshot {
  professor: Set<number>;
  schedule: Set<number>;
}

/** Captures which rows were missing a professor/horario at load time. */
export const buildSnapshot = (rows: GridRow[]): MissingSnapshot => {
  const professor = new Set<number>();
  const schedule = new Set<number>();
  for (const row of rows) {
    if (row.professorId === null) professor.add(row.enrollmentId);
    if (!hasAnySchedule(row)) schedule.add(row.enrollmentId);
  }
  return { professor, schedule };
};

/**
 * Filters rows by the AND of all active filters. missingProfessor/
 * missingSchedule test snapshot membership (frozen at load), not the row's
 * current state, so a row being edited doesn't disappear mid-edit. Input
 * order is preserved.
 */
export const filterRows = (
  rows: GridRow[],
  f: GridFilters,
  snap: MissingSnapshot,
): GridRow[] =>
  rows.filter((row) => {
    if (!matchesSearch(row, f.search)) return false;
    if (f.careerName !== null && row.careerName !== f.careerName) return false;
    if (f.professorId !== null && row.professorId !== f.professorId) return false;
    if (f.missingProfessor && !snap.professor.has(row.enrollmentId)) return false;
    if (f.missingSchedule && !snap.schedule.has(row.enrollmentId)) return false;
    return true;
  });

/** Live (not snapshotted) counts of rows currently missing a professor/horario. */
export const liveCounts = (
  rows: GridRow[],
): { missingProfessor: number; missingSchedule: number } => {
  let missingProfessor = 0;
  let missingSchedule = 0;
  for (const row of rows) {
    if (row.professorId === null) missingProfessor++;
    if (!hasAnySchedule(row)) missingSchedule++;
  }
  return { missingProfessor, missingSchedule };
};
