// Optimistic commit handlers for the schedule grid, extracted from the page so
// ScheduleAssignment.tsx stays a layout/wiring component. Every handler updates
// the row set immediately, enqueues the network write on the autosave queue,
// and reverts on failure — navigation (stopEdit + move) never waits for a
// response.
//
// Ordering guarantees come from the queue's serialKey (`enr:<id>`): all writes
// for one enrollment run strictly in order, so an aula PUT queued right after a
// slot's POST reaches the backend only after the POST returned the schedule id.
// To make that id visible to the queued PUT's request closure BEFORE React has
// re-rendered, every optimistic/onSuccess/revert update goes through
// `applyRows`, which updates the live `rowsRef` synchronously in addition to
// calling setRows.
import { useCallback } from "react";
import type { AxiosInstance } from "axios";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { AutosaveJob } from "./autosaveQueue";
import { toApiTime } from "./time";
import { colSlotIndex } from "./types";
import type {
  CellAddress,
  ColKey,
  GridRow,
  MoveDir,
  Slot,
  SlotIndex,
  Teacher,
  TimeRangeValue,
} from "./types";

type Slots = GridRow["slots"];

interface ScheduleResponse {
  schedule?: { id?: number } | null;
}

const SCHEDULE_URL = "courses/manage-enrollment-schedules";

const replaceSlot = (slots: Slots, i: SlotIndex, slot: Slot | null): Slots => {
  const next: Slots = [slots[0], slots[1], slots[2]];
  next[i] = slot;
  return next;
};

const mapSlot = (slots: Slots, i: SlotIndex, fn: (s: Slot | null) => Slot | null): Slots =>
  replaceSlot(slots, i, fn(slots[i]));

export interface UseGridCommitsArgs {
  axiosPrivate: AxiosInstance;
  teacherById: Map<number, Teacher>;
  rowsRef: RefObject<GridRow[]>;
  setRows: Dispatch<SetStateAction<GridRow[]>>;
  save: <T>(job: AutosaveJob<T>) => void;
  setHint: (enrollmentId: number, col: ColKey, message: string) => void;
  setTransientError: (enrollmentId: number, col: ColKey, message: string) => void;
  stopEdit: () => void;
  move: (dir: MoveDir) => void;
  showUndoToast: (message: string, onUndo: () => void) => void;
}

export interface UseGridCommitsResult {
  commitProfessor: (enrollmentId: number, teacherId: number | null, dir: MoveDir) => void;
  commitTime: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    value: TimeRangeValue,
    dir: MoveDir,
  ) => void;
  commitAula: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    classroomId: number | null,
    dir: MoveDir,
  ) => void;
  cancelEdit: (dir: MoveDir) => void;
  cancelTime: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    dir: MoveDir,
    error?: string,
  ) => void;
  onDeleteCell: (a: CellAddress) => void;
  canEdit: (a: CellAddress) => boolean;
}

export function useGridCommits({
  axiosPrivate,
  teacherById,
  rowsRef,
  setRows,
  save,
  setHint,
  setTransientError,
  stopEdit,
  move,
  showUndoToast,
}: UseGridCommitsArgs): UseGridCommitsResult {
  // The single channel for every row mutation: keep rowsRef in lockstep with
  // React state so a queued follow-up write (e.g. an aula PUT after a slot POST)
  // reads the freshest slot synchronously, before the next render.
  const applyRows = useCallback(
    (updater: (list: GridRow[]) => GridRow[]) => {
      rowsRef.current = updater(rowsRef.current);
      setRows(updater);
    },
    [rowsRef, setRows],
  );

  const findRow = useCallback(
    (enrollmentId: number): GridRow | undefined =>
      rowsRef.current.find((r) => r.enrollmentId === enrollmentId),
    [rowsRef],
  );

  // --- Professor (unchanged behaviour, moved out of the page) ---------------
  const commitProfessor = useCallback(
    (enrollmentId: number, teacherId: number | null, dir: MoveDir) => {
      const teacher = teacherId !== null ? teacherById.get(teacherId) ?? null : null;
      const prev = findRow(enrollmentId);
      const prevId = prev?.professorId ?? null;
      const prevName = prev?.professorName ?? null;
      const prevNotif = prev?.notificationPending ?? false;
      // Mirrors the backend's mark_schedule_notification: a professor change
      // only flags the row pending when it already has >=1 slot (Task 12).
      const hasSlot = prev?.slots.some((s) => s !== null) ?? false;

      applyRows((current) =>
        current.map((r) =>
          r.enrollmentId === enrollmentId
            ? {
                ...r,
                professorId: teacherId,
                professorName: teacher ? `${teacher.last_name} ${teacher.first_name}` : null,
                notificationPending: hasSlot ? true : r.notificationPending,
              }
            : r,
        ),
      );

      const revert = (): void => {
        applyRows((current) =>
          current.map((r) =>
            r.enrollmentId === enrollmentId
              ? {
                  ...r,
                  professorId: prevId,
                  professorName: prevName,
                  notificationPending: prevNotif,
                }
              : r,
          ),
        );
      };

      save({
        serialKey: `enr:${enrollmentId}`,
        cellKey: `${enrollmentId}:prof`,
        request: () =>
          axiosPrivate.put<{ enrollment?: { professor_full_name?: string | null } }>(
            "courses/manage-enrollments",
            { enrollment_id: enrollmentId, professor_id: teacherId },
          ),
        onSuccess: (r) => {
          const full = r.data.enrollment?.professor_full_name;
          if (full === undefined) return;
          // Only sync the display name if this edit is still the current one for
          // the row (professorId unchanged) — a stale in-flight response for an
          // already-superseded edit must not flip the name back.
          applyRows((current) =>
            current.map((row) =>
              row.enrollmentId === enrollmentId && row.professorId === teacherId
                ? { ...row, professorName: full ?? null }
                : row,
            ),
          );
        },
        revert,
      });

      stopEdit();
      if (dir !== "none") move(dir);
    },
    [teacherById, findRow, applyRows, save, axiosPrivate, stopEdit, move],
  );

  // --- Time range (day + start + end) ---------------------------------------
  const commitTime = useCallback(
    (enrollmentId: number, slotIndex: SlotIndex, value: TimeRangeValue, dir: MoveDir) => {
      const { day, start, end } = value;
      const prevRow = findRow(enrollmentId);
      const prevSlot = prevRow?.slots[slotIndex] ?? null;
      const prevNotif = prevRow?.notificationPending ?? false;
      // Captured at commit time: if this slot already has a schedule id, the
      // request is always a PUT — even if a reload has since dropped the row
      // from state, so we never POST a duplicate for an existing horario.
      const capturedId = prevSlot?.scheduleId ?? null;

      const nextSlot: Slot = prevSlot
        ? { ...prevSlot, day, start, end }
        : { scheduleId: null, day, start, end, classroomId: null };

      // The row now has >=1 slot → optimistically mark it pending (Task 12).
      applyRows((current) =>
        current.map((r) =>
          r.enrollmentId === enrollmentId
            ? { ...r, slots: replaceSlot(r.slots, slotIndex, nextSlot), notificationPending: true }
            : r,
        ),
      );

      const revert = (): void => {
        applyRows((current) =>
          current.map((r) =>
            r.enrollmentId === enrollmentId
              ? {
                  ...r,
                  // Restore ONLY day/start/end on the current slot (keeping any
                  // scheduleId/classroomId a concurrent write set); a POST that
                  // had no prior slot rolls back to an empty cell.
                  slots: prevSlot
                    ? mapSlot(r.slots, slotIndex, (s) =>
                        s
                          ? { ...s, day: prevSlot.day, start: prevSlot.start, end: prevSlot.end }
                          : s,
                      )
                    : replaceSlot(r.slots, slotIndex, null),
                  notificationPending: prevNotif,
                }
              : r,
          ),
        );
      };

      save({
        serialKey: `enr:${enrollmentId}`,
        cellKey: `${enrollmentId}:t${slotIndex}`,
        request: () => {
          // PUT whenever an id exists (live row's, or the one captured at commit
          // time if a reload dropped the row); POST only for a genuinely new slot.
          const currentId = findRow(enrollmentId)?.slots[slotIndex]?.scheduleId ?? capturedId;
          const body = { day, hour: toApiTime(start), end_hour: toApiTime(end) };
          return currentId
            ? axiosPrivate.put<ScheduleResponse>(SCHEDULE_URL, {
                schedule_id: currentId,
                ...body,
              })
            : axiosPrivate.post<ScheduleResponse>(SCHEDULE_URL, {
                course_enrollment_id: enrollmentId,
                ...body,
              });
        },
        onSuccess: (r) => {
          const id = r.data?.schedule?.id;
          if (!id) return;
          const row = findRow(enrollmentId);
          // Row no longer loaded (e.g. reloaded into a different year) → leave
          // the server's row as-is; a later Recargar is the source of truth.
          if (!row) return;
          const slot = row.slots[slotIndex];
          // Orphan guard: the user may have deleted this horario while the POST
          // was in flight (that delete was a no-op server-side, so the row the
          // server just created for `id` would never be cleaned up). Only DELETE
          // when the target slot is null AND no slot of this row holds the id.
          if (slot === null) {
            if (!row.slots.some((s) => s?.scheduleId === id)) {
              save({
                serialKey: `enr:${enrollmentId}`,
                cellKey: `${enrollmentId}:t${slotIndex}`,
                request: () => axiosPrivate.delete(SCHEDULE_URL, { data: { schedule_id: id } }),
                revert: () => {},
              });
            }
            return;
          }
          applyRows((current) =>
            current.map((r2) =>
              r2.enrollmentId === enrollmentId
                ? {
                    ...r2,
                    slots: mapSlot(r2.slots, slotIndex, (s) =>
                      s ? { ...s, scheduleId: id } : s,
                    ),
                  }
                : r2,
            ),
          );
        },
        revert,
      });

      stopEdit();
      if (dir !== "none") move(dir);
    },
    [findRow, applyRows, save, axiosPrivate, stopEdit, move],
  );

  // --- Aula (classroom) -----------------------------------------------------
  const commitAula = useCallback(
    (enrollmentId: number, slotIndex: SlotIndex, classroomId: number | null, dir: MoveDir) => {
      const row = findRow(enrollmentId);
      const slot = row?.slots[slotIndex] ?? null;
      // No slot to attach the aula to → hint and bail (defensive; canEdit gates
      // edit-mode entry on empty aula cells).
      if (!slot) {
        setHint(enrollmentId, `a${slotIndex}` as ColKey, "Primero asigne día y hora");
        stopEdit();
        if (dir !== "none") move(dir);
        return;
      }

      const prevClassroom = slot.classroomId;
      const prevNotif = row?.notificationPending ?? false;

      applyRows((current) =>
        current.map((r) =>
          r.enrollmentId === enrollmentId
            ? {
                ...r,
                slots: mapSlot(r.slots, slotIndex, (s) => (s ? { ...s, classroomId } : s)),
                // The slot we just attached an aula to already counts as >=1
                // slot on this row → mark it pending (Task 12).
                notificationPending: true,
              }
            : r,
        ),
      );

      const revert = (): void => {
        applyRows((current) =>
          current.map((r) =>
            r.enrollmentId === enrollmentId
              ? {
                  ...r,
                  slots: mapSlot(r.slots, slotIndex, (s) =>
                    s ? { ...s, classroomId: prevClassroom } : s,
                  ),
                  notificationPending: prevNotif,
                }
              : r,
          ),
        );
      };

      save({
        serialKey: `enr:${enrollmentId}`,
        cellKey: `${enrollmentId}:a${slotIndex}`,
        request: () => {
          const s = findRow(enrollmentId)?.slots[slotIndex];
          if (!s?.scheduleId) {
            return Promise.reject({ response: { data: { error: "Primero asigne día y hora" } } });
          }
          return axiosPrivate.put<ScheduleResponse>(SCHEDULE_URL, {
            schedule_id: s.scheduleId,
            classroom_id: classroomId,
          });
        },
        revert,
      });

      stopEdit();
      if (dir !== "none") move(dir);
    },
    [findRow, applyRows, save, axiosPrivate, setHint, stopEdit, move],
  );

  // --- Cancels --------------------------------------------------------------
  const cancelEdit = useCallback(
    (dir: MoveDir) => {
      stopEdit();
      if (dir !== "none") move(dir);
    },
    [stopEdit, move],
  );

  const cancelTime = useCallback(
    (enrollmentId: number, slotIndex: SlotIndex, dir: MoveDir, error?: string) => {
      stopEdit();
      if (error) setTransientError(enrollmentId, `t${slotIndex}` as ColKey, error);
      if (dir !== "none") move(dir);
    },
    [stopEdit, setTransientError, move],
  );

  // --- Delete + undo --------------------------------------------------------
  const onDeleteCell = useCallback(
    (a: CellAddress) => {
      const row = findRow(a.enrollmentId);
      if (!row) return;

      if (a.col === "prof") {
        if (row.professorId !== null) commitProfessor(a.enrollmentId, null, "none");
        return;
      }

      const i = colSlotIndex(a.col);
      const slot = row.slots[i];
      if (!slot) return;

      if (a.col === "t0" || a.col === "t1" || a.col === "t2") {
        const removed = slot;
        applyRows((current) =>
          current.map((r) =>
            r.enrollmentId === a.enrollmentId
              ? { ...r, slots: replaceSlot(r.slots, i, null) }
              : r,
          ),
        );

        save({
          serialKey: `enr:${a.enrollmentId}`,
          cellKey: `${a.enrollmentId}:t${i}`,
          request: (): Promise<unknown> =>
            removed.scheduleId
              ? axiosPrivate.delete(SCHEDULE_URL, { data: { schedule_id: removed.scheduleId } })
              : Promise.resolve(),
          revert: () =>
            applyRows((current) =>
              current.map((r) =>
                r.enrollmentId === a.enrollmentId
                  ? { ...r, slots: replaceSlot(r.slots, i, removed) }
                  : r,
              ),
            ),
        });

        // Undo re-creates the slot in the SAME position: a fresh POST (the id is
        // gone), followed — same serialKey, so strictly after — by an aula PUT
        // when the removed slot had a classroom.
        showUndoToast("Horario eliminado", () => {
          if (removed.day !== null && removed.start !== null && removed.end !== null) {
            commitTime(
              a.enrollmentId,
              i,
              { day: removed.day, start: removed.start, end: removed.end },
              "none",
            );
            if (removed.classroomId !== null) {
              commitAula(a.enrollmentId, i, removed.classroomId, "none");
            }
          }
        });
        return;
      }

      // Aula cell with a classroom → clear it.
      if (slot.classroomId !== null) commitAula(a.enrollmentId, i, null, "none");
    },
    [findRow, applyRows, save, axiosPrivate, showUndoToast, commitProfessor, commitTime, commitAula],
  );

  // canEdit gates edit-mode entry: prof/time always editable; an aula cell only
  // once its slot exists — otherwise show the "add a schedule first" hint.
  const canEdit = useCallback(
    (a: CellAddress): boolean => {
      if (a.col === "prof" || a.col === "t0" || a.col === "t1" || a.col === "t2") return true;
      const i = colSlotIndex(a.col);
      const slot = findRow(a.enrollmentId)?.slots[i];
      if (slot) return true;
      setHint(a.enrollmentId, a.col, "Primero asigne día y hora");
      return false;
    },
    [findRow, setHint],
  );

  return {
    commitProfessor,
    commitTime,
    commitAula,
    cancelEdit,
    cancelTime,
    onDeleteCell,
    canEdit,
  };
}
