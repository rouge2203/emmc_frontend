// Pure autosave queue for the schedule grid. Kept React-free so it is unit
// tested directly with manually-resolved (deferred) promises.
//
// Every cell edit saves immediately. Two ordering rules apply:
//  - saves for the same enrollment (serialKey, e.g. "enr:123") must run in
//    strict order, since an aula PUT needs the schedule id returned by the
//    slot's POST and the backend does full-row saves on the enrollment;
//  - saves for the same cell (cellKey, e.g. "123:t0") must ignore stale
//    responses: only the LATEST job enqueued for a cell may revert the
//    optimistic update or report a terminal status, even though `onSuccess`
//    and `onError` always fire so state that must never be lost (a new
//    schedule id, a user-facing error toast) is never dropped.
import type { CellSaveState } from "./types";

export interface AutosaveJob<T = unknown> {
  /** Jobs with the same serialKey run strictly one after another (e.g. 'enr:123'). */
  serialKey: string;
  /** Status + stale-guard key (e.g. '123:t0'). */
  cellKey: string;
  /** Built lazily; runs when the job reaches the front of its serialKey chain. */
  request: () => Promise<T>;
  /** ALWAYS applied on success, even if a newer job for the same cell exists (e.g. capture a new schedule id). */
  onSuccess?: (result: T) => void;
  /** Undo the optimistic update; called only if this job is still the latest for its cell. */
  revert: () => void;
}

export interface AutosaveCallbacks {
  onStatus: (cellKey: string, state: CellSaveState) => void;
  /** Page-level toast; called for every failure, stale or not. */
  onError: (message: string) => void;
  /** Called after every success (used to refresh the notification summary). */
  onSaved?: (job: AutosaveJob<unknown>) => void;
  /** Injectable clock for tests (default Date.now). */
  now?: () => number;
}

interface ErrorLike {
  response?: { data?: { error?: string } };
}

/** `(e as any)?.response?.data?.error || 'Error de conexión al guardar'`. */
export function errorMessageOf(e: unknown): string {
  const message = (e as ErrorLike | null | undefined)?.response?.data?.error;
  return message || "Error de conexión al guardar";
}

export class AutosaveQueue {
  private readonly onStatus: AutosaveCallbacks["onStatus"];
  private readonly onError: AutosaveCallbacks["onError"];
  private readonly onSaved: AutosaveCallbacks["onSaved"];
  private readonly now: () => number;
  private readonly chains = new Map<string, Promise<void>>();
  private readonly seqByCell = new Map<string, number>();
  private pending = 0;
  private idleWaiters: Array<() => void> = [];

  constructor(callbacks: AutosaveCallbacks) {
    this.onStatus = callbacks.onStatus;
    this.onError = callbacks.onError;
    this.onSaved = callbacks.onSaved;
    this.now = callbacks.now ?? Date.now;
  }

  enqueue<T>(job: AutosaveJob<T>): void {
    const seq = (this.seqByCell.get(job.cellKey) ?? 0) + 1;
    this.seqByCell.set(job.cellKey, seq);
    this.onStatus(job.cellKey, { status: "saving", at: this.now() });
    this.pending++;

    const isLatest = (): boolean => this.seqByCell.get(job.cellKey) === seq;

    const run = async (): Promise<void> => {
      const at = this.now();
      try {
        const result = await job.request();
        job.onSuccess?.(result);
        if (isLatest()) {
          this.onStatus(job.cellKey, { status: "saved", at });
        }
        this.onSaved?.(job as unknown as AutosaveJob<unknown>);
      } catch (e) {
        const message = errorMessageOf(e);
        if (isLatest()) {
          job.revert();
          this.onStatus(job.cellKey, { status: "error", message, at });
        }
        this.onError(message);
      } finally {
        this.pending--;
        if (this.pending === 0) {
          const waiters = this.idleWaiters;
          this.idleWaiters = [];
          waiters.forEach((resolve) => resolve());
        }
      }
    };

    const prior = this.chains.get(job.serialKey) ?? Promise.resolve();
    // A failed predecessor must not block successors: both branches run `run`.
    const chain = prior.then(run, run);
    this.chains.set(job.serialKey, chain);
    void chain.finally(() => {
      if (this.chains.get(job.serialKey) === chain) {
        this.chains.delete(job.serialKey);
      }
    });
  }

  /** Resolves when every chain has drained; resolves immediately when nothing is pending. */
  idle(): Promise<void> {
    if (this.pending === 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.idleWaiters.push(resolve);
    });
  }

  /** Jobs enqueued but not yet settled. */
  pendingCount(): number {
    return this.pending;
  }
}
