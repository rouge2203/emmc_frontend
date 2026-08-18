// Data hook for the "Asignación de Horarios" grid. Owns the row set, the
// reference lists (teachers/classrooms/careers/years) and the missing-snapshot.
// Row order is computed ONCE per load (orderRows) so the grid never reshuffles
// mid-assignment; the snapshot is likewise frozen per load (see filters.ts).
// setRows/rowsRef are exposed for later tasks: autosave (Task 10) mutates rows
// optimistically and reads rowsRef inside save closures.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { orderRows, toGridRow } from "./sorting";
import { buildSnapshot } from "./filters";
import type { MissingSnapshot } from "./filters";
import type { ApiEnrollment, Classroom, GridRow, Teacher } from "./types";

/** Reference lists (and id lookups) shared by every cell in the grid. */
export interface GridRefData {
  teachers: Teacher[];
  classrooms: Classroom[];
  careers: { id: number; name: string }[];
  years: number[];
  teacherById: Map<number, Teacher>;
  classroomById: Map<number, Classroom>;
}

export interface UseGridDataResult {
  rows: GridRow[];
  setRows: Dispatch<SetStateAction<GridRow[]>>;
  rowsRef: RefObject<GridRow[]>;
  snapshot: MissingSnapshot;
  loading: boolean;
  error: string | null;
  truncated: { shown: number; total: number } | null;
  reload: () => Promise<void>;
  ref: GridRefData;
  refError: string | null;
}

interface EnrollmentsApiResponse {
  results: ApiEnrollment[];
  pagination?: { total_count?: number } | null;
}

const EMPTY_SNAPSHOT: MissingSnapshot = { professor: new Set(), schedule: new Set() };

export function useGridData(args: {
  year: number;
  period: number | null;
  /** Awaited before any (re)fetch so a year/period change or reload never
   *  starts until the autosave queue has drained. */
  beforeReload?: () => Promise<void>;
}): UseGridDataResult {
  const { year, period, beforeReload } = args;
  const axiosPrivate = useAxiosPrivate();

  const [rows, setRows] = useState<GridRow[]>([]);
  const rowsRef = useRef<GridRow[]>([]);
  const [snapshot, setSnapshot] = useState<MissingSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState<{ shown: number; total: number } | null>(null);

  // Reference lists.
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [careers, setCareers] = useState<{ id: number; name: string }[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [refError, setRefError] = useState<string | null>(null);

  // Monotonic id of the most recent rows request; older responses are
  // discarded so a slow earlier answer can't overwrite a newer one.
  const latestRequestId = useRef(0);

  // Keep rowsRef in sync so later autosave closures always read current rows.
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    setError(null);
    // Let queued autosaves finish first so a refetch can't race an in-flight
    // write (and overwrite the optimistic row it was about to persist).
    if (beforeReload) await beforeReload();
    if (requestId !== latestRequestId.current) return; // superseded while waiting
    try {
      const params: Record<string, string | number> = {
        report_schedules: "true",
        status: "cursando",
        page_size: 1000,
        year,
      };
      if (period !== null) params.period = period;

      const response = await axiosPrivate.get<EnrollmentsApiResponse>(
        "courses/manage-enrollments",
        { params },
      );
      if (requestId !== latestRequestId.current) return;

      const results = response.data.results ?? [];
      const ordered = orderRows(results.map(toGridRow));
      setRows(ordered);
      setSnapshot(buildSnapshot(ordered));

      const total = response.data.pagination?.total_count ?? results.length;
      setTruncated(total > results.length ? { shown: results.length, total } : null);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError("No se pudieron cargar las matrículas");
      console.error("Error fetching schedule grid rows:", err);
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  }, [axiosPrivate, year, period, beforeReload]);

  // Refetch whenever year/period change (and via reload()).
  useEffect(() => {
    void load();
  }, [load]);

  // Reference lists load once; a failed one degrades gracefully.
  useEffect(() => {
    let cancelled = false;
    const loadReference = async (): Promise<void> => {
      const [teachersR, classroomsR, careersR, yearsR] = await Promise.allSettled([
        axiosPrivate.get<{ users: Teacher[] }>("courses/list-users-for-enrollment", {
          params: { role: "teacher" },
        }),
        axiosPrivate.get<{ classrooms: Classroom[] }>("courses/classrooms"),
        axiosPrivate.get<{ careers: { id: number; name: string }[] }>("courses/manage-careers"),
        axiosPrivate.get<{ years: number[] }>("courses/enrollment-years"),
      ]);
      if (cancelled) return;

      let anyFailed = false;
      if (teachersR.status === "fulfilled") setTeachers(teachersR.value.data.users ?? []);
      else anyFailed = true;
      if (classroomsR.status === "fulfilled") setClassrooms(classroomsR.value.data.classrooms ?? []);
      else anyFailed = true;
      if (careersR.status === "fulfilled") setCareers(careersR.value.data.careers ?? []);
      else anyFailed = true;
      if (yearsR.status === "fulfilled") setYears(yearsR.value.data.years ?? []);
      else anyFailed = true;

      setRefError(anyFailed ? "No se pudieron cargar profesores/aulas" : null);
    };
    void loadReference();
    return () => {
      cancelled = true;
    };
  }, [axiosPrivate]);

  const teacherById = useMemo(
    () => new Map(teachers.map((t) => [t.id, t] as const)),
    [teachers],
  );
  const classroomById = useMemo(
    () => new Map(classrooms.map((c) => [c.id, c] as const)),
    [classrooms],
  );
  const ref = useMemo<GridRefData>(
    () => ({ teachers, classrooms, careers, years, teacherById, classroomById }),
    [teachers, classrooms, careers, years, teacherById, classroomById],
  );

  return {
    rows,
    setRows,
    rowsRef,
    snapshot,
    loading,
    error,
    truncated,
    reload: load,
    ref,
    refError,
  };
}
