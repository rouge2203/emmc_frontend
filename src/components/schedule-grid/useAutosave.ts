// React wrapper around the pure AutosaveQueue. Owns per-cell save status (for
// the tiny CellStatus indicators) and the page-level error toast. Every cell
// edit calls save(); navigation never waits for the network.
//
// The status map is keyed by enrollmentId → { col: CellSaveState }. Each update
// replaces ONLY the affected row's object (and only that col) immutably, so a
// save on one row never re-renders the others (GridRowView is memoized and
// reads its row's object by reference).
//
// Auto-clear timers: `saved` fades after 1200 ms, `hint` after 2500 ms; a new
// status for the same cell cancels the pending clear. Errors persist (red ring)
// until the next save on that cell. All timers are cleared on unmount.
import { useCallback, useEffect, useRef, useState } from "react";
import { AutosaveQueue } from "./autosaveQueue";
import type { AutosaveJob } from "./autosaveQueue";
import type { CellSaveState, ColKey } from "./types";

const SAVED_CLEAR_MS = 1200;
const HINT_CLEAR_MS = 2500;
const TOAST_HIDE_MS = 5000;

type RowStatuses = Partial<Record<ColKey, CellSaveState>>;

export interface UseAutosaveResult {
  save: <T>(job: AutosaveJob<T>) => void;
  statusFor: (enrollmentId: number, col: ColKey) => CellSaveState | undefined;
  rowStatuses: (enrollmentId: number) => RowStatuses | undefined;
  setHint: (enrollmentId: number, col: ColKey, message: string) => void;
  idle: () => Promise<void>;
  pendingCount: () => number;
  toast: { show: boolean; message: string };
  dismissToast: () => void;
}

/** `${enrollmentId}:${col}` → its parts. col may itself contain no ':'. */
const parseCellKey = (cellKey: string): { enrollmentId: number; col: ColKey } => {
  const idx = cellKey.indexOf(":");
  return {
    enrollmentId: Number(cellKey.slice(0, idx)),
    col: cellKey.slice(idx + 1) as ColKey,
  };
};

export function useAutosave(opts: { onSaved?: () => void }): UseAutosaveResult {
  const [statuses, setStatuses] = useState<Map<number, RowStatuses>>(() => new Map());
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  });

  const clearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSavedRef = useRef(opts.onSaved);
  onSavedRef.current = opts.onSaved;

  // Immutable per-row update: replace only `enrollmentId`'s object, leaving the
  // other rows' objects referentially unchanged.
  const setCellStatus = useCallback(
    (enrollmentId: number, col: ColKey, state: CellSaveState | null) => {
      setStatuses((prev) => {
        const next = new Map(prev);
        const row: RowStatuses = { ...(next.get(enrollmentId) ?? {}) };
        if (state === null) delete row[col];
        else row[col] = state;
        if (Object.keys(row).length === 0) next.delete(enrollmentId);
        else next.set(enrollmentId, row);
        return next;
      });
    },
    [],
  );

  const cancelClear = useCallback((enrollmentId: number, col: ColKey) => {
    const key = `${enrollmentId}:${col}`;
    const existing = clearTimers.current.get(key);
    if (existing) {
      clearTimeout(existing);
      clearTimers.current.delete(key);
    }
  }, []);

  const scheduleClear = useCallback(
    (enrollmentId: number, col: ColKey, ms: number) => {
      const key = `${enrollmentId}:${col}`;
      const existing = clearTimers.current.get(key);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        clearTimers.current.delete(key);
        setCellStatus(enrollmentId, col, null);
      }, ms);
      clearTimers.current.set(key, t);
    },
    [setCellStatus],
  );

  const showToast = useCallback((message: string) => {
    setToast({ show: true, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, TOAST_HIDE_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast((t) => ({ ...t, show: false }));
  }, []);

  // One queue for the lifetime of the hook. Its callbacks close over the stable
  // helpers above (all useCallback), so creating it once is safe.
  const queueRef = useRef<AutosaveQueue | null>(null);
  if (queueRef.current === null) {
    queueRef.current = new AutosaveQueue({
      onStatus: (cellKey, state) => {
        const { enrollmentId, col } = parseCellKey(cellKey);
        setCellStatus(enrollmentId, col, state);
        if (state.status === "saved") scheduleClear(enrollmentId, col, SAVED_CLEAR_MS);
        else cancelClear(enrollmentId, col); // saving / error persist until next save
      },
      onError: (message) => showToast(message),
      onSaved: () => onSavedRef.current?.(),
    });
  }

  const save = useCallback(<T,>(job: AutosaveJob<T>): void => {
    queueRef.current?.enqueue(job);
  }, []);

  const setHint = useCallback(
    (enrollmentId: number, col: ColKey, message: string) => {
      setCellStatus(enrollmentId, col, { status: "hint", message, at: Date.now() });
      scheduleClear(enrollmentId, col, HINT_CLEAR_MS);
    },
    [setCellStatus, scheduleClear],
  );

  const statusFor = useCallback(
    (enrollmentId: number, col: ColKey) => statuses.get(enrollmentId)?.[col],
    [statuses],
  );
  const rowStatuses = useCallback(
    (enrollmentId: number) => statuses.get(enrollmentId),
    [statuses],
  );

  const idle = useCallback(() => queueRef.current?.idle() ?? Promise.resolve(), []);
  const pendingCount = useCallback(() => queueRef.current?.pendingCount() ?? 0, []);

  useEffect(() => {
    const timers = clearTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return {
    save,
    statusFor,
    rowStatuses,
    setHint,
    idle,
    pendingCount,
    toast,
    dismissToast,
  };
}
