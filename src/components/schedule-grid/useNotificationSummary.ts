// Polls the schedule-notification summary (who is pending, whether a send is
// currently running anywhere) so every admin, on every tab, converges on the
// same state without a page reload. Also owns the one-shot "send" action.
//
// Polling cadence: 4 s while a batch is running (so progress feels live), 60 s
// otherwise (so an idle tab doesn't hammer the backend). Implemented as a
// single self-rescheduling GET (via a ref-held timer) rather than
// setInterval, since the delay itself changes based on the last response.
//
// `sending` is optimistic: it flips true synchronously on click (before the
// POST even resolves) and only flips back to false once a poll observes
// `active_batch === null` — which also covers the case where the button was
// left mid-send and another poll later confirms it settled. A 202 response
// merges its batch into `summary` immediately (so the button shows live
// numbers before the next poll) and fast-forwards the poll timer to the 4 s
// cadence; a 409 (someone else already sending) just triggers `refreshNow()`,
// which will observe that admin's batch and keep `sending` true until it too
// clears.
import { useCallback, useEffect, useRef, useState } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

export interface NotificationBatch {
  id: number;
  status: "running" | "done" | "failed";
  total_students: number;
  sent_count: number;
  failed_count: number;
  last_error: string;
  created_by_name: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}
export interface PendingEnrollment {
  enrollment_id: number;
  course_code: string;
  course_name: string;
  year: number;
  period_display: string;
  schedules_count: number;
  pending_since: string | null;
}
export interface PendingStudent {
  student_id: number;
  student_name: string;
  email?: string | null;
  enrollments: PendingEnrollment[];
}
export interface NotificationSummary {
  pending_students: number;
  pending: PendingStudent[];
  without_email: PendingStudent[];
  active_batch: NotificationBatch | null;
  last_batch: NotificationBatch | null;
}

export interface UseNotificationSummaryResult {
  summary: NotificationSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  refreshNow: () => Promise<void>;
  send: () => Promise<void>;
  sending: boolean;
  justFinished: NotificationBatch | null;
}

const SUMMARY_URL = "courses/schedule-notifications";
const SEND_URL = "courses/schedule-notifications/send";
const ACTIVE_POLL_MS = 4000;
const IDLE_POLL_MS = 60000;
const REFRESH_DEBOUNCE_MS = 1500;
const JUST_FINISHED_CLEAR_MS = 6000;
const LOAD_ERROR_MESSAGE = "No se pudo cargar el estado de notificaciones";
const SEND_ERROR_FALLBACK = "No se pudieron enviar los correos";

interface SendResponse {
  batch: NotificationBatch;
}
interface SendErrorBody {
  error?: string;
  batch?: NotificationBatch | null;
}

export function useNotificationSummary(): UseNotificationSummaryResult {
  const axiosPrivate = useAxiosPrivate();

  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [justFinished, setJustFinished] = useState<NotificationBatch | null>(null);

  // Discards a response from a stale in-flight GET (superseded by a newer one,
  // or the hook has unmounted — unmount bumps this past every in-flight id).
  const latestRequestId = useRef(0);
  // Last known active_batch, used only to detect the running -> null edge.
  const prevActiveRef = useRef<NotificationBatch | null>(null);
  // A send the user initiated is still "in flight" (guards a double click).
  const sendInFlightRef = useRef(false);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justFinishedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Indirection so the self-rescheduling poll always calls the CURRENT
  // fetchSummary closure without fetchSummary needing to reference itself.
  const fetchSummaryRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const scheduleNextPoll = useCallback((activeBatch: NotificationBatch | null) => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    const delay = activeBatch !== null ? ACTIVE_POLL_MS : IDLE_POLL_MS;
    pollTimer.current = setTimeout(() => {
      void fetchSummaryRef.current();
    }, delay);
  }, []);

  const fetchSummary = useCallback(async (): Promise<void> => {
    const requestId = ++latestRequestId.current;
    let nextActiveBatch: NotificationBatch | null = prevActiveRef.current;
    try {
      const res = await axiosPrivate.get<NotificationSummary>(SUMMARY_URL);
      if (requestId !== latestRequestId.current) return; // superseded or unmounted
      const data = res.data;

      if (prevActiveRef.current !== null && data.active_batch === null) {
        setJustFinished(data.last_batch);
        if (justFinishedTimer.current) clearTimeout(justFinishedTimer.current);
        justFinishedTimer.current = setTimeout(() => {
          setJustFinished(null);
        }, JUST_FINISHED_CLEAR_MS);
      }
      prevActiveRef.current = data.active_batch;
      nextActiveBatch = data.active_batch;

      setSummary(data);
      setError(null);
      if (data.active_batch === null) setSending(false);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(LOAD_ERROR_MESSAGE);
      console.error("Error fetching schedule notification summary:", err);
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
        scheduleNextPoll(nextActiveBatch);
      }
    }
  }, [axiosPrivate, scheduleNextPoll]);

  useEffect(() => {
    fetchSummaryRef.current = fetchSummary;
  }, [fetchSummary]);

  useEffect(() => {
    void fetchSummary();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (justFinishedTimer.current) clearTimeout(justFinishedTimer.current);
      // Invalidate any response still in flight so it can't setState (or
      // reschedule another poll) after unmount.
      latestRequestId.current += 1;
    };
    // fetchSummary is referentially stable (axiosPrivate is a module-level
    // singleton, scheduleNextPoll has no deps), so this still runs once per
    // mount despite the dependency.
  }, [fetchSummary]);

  // Debounced (trailing) refresh — safe to call after every save without
  // flooding the backend when several cells save in quick succession.
  const refresh = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      void fetchSummary();
    }, REFRESH_DEBOUNCE_MS);
  }, [fetchSummary]);

  const refreshNow = useCallback(async (): Promise<void> => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    await fetchSummary();
  }, [fetchSummary]);

  const send = useCallback(async (): Promise<void> => {
    if (sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    setSending(true);
    setError(null);
    try {
      const res = await axiosPrivate.post<SendResponse>(SEND_URL, {});
      const batch = res.data.batch;
      prevActiveRef.current = batch;
      setSummary((prev) => (prev ? { ...prev, active_batch: batch } : prev));
      // Fast-forward polling to the "running" cadence so progress shows up
      // within a few seconds instead of waiting out an idle 60 s window.
      scheduleNextPoll(batch);
    } catch (err) {
      const axiosErr = err as { response?: { status?: number; data?: SendErrorBody } };
      if (axiosErr.response?.status === 409) {
        // Someone else is already sending — just resync; `sending` stays
        // true because refreshNow() will observe their active_batch.
        await refreshNow();
      } else {
        setError(axiosErr.response?.data?.error ?? SEND_ERROR_FALLBACK);
        setSending(false);
      }
    } finally {
      sendInFlightRef.current = false;
    }
  }, [axiosPrivate, refreshNow, scheduleNextPoll]);

  return { summary, loading, error, refresh, refreshNow, send, sending, justFinished };
}
