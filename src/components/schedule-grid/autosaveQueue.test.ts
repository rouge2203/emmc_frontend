import { describe, expect, it, vi } from "vitest";
import { AutosaveQueue, errorMessageOf, type AutosaveJob } from "./autosaveQueue";
import type { CellSaveState } from "./types";

/** Manually-resolved promise for controlling async ordering in tests. */
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}
const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/** Flushes pending microtasks (promise .then chains) without needing fake timers. */
const flush = async (times = 10): Promise<void> => {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
};

const job = <T>(overrides: Partial<AutosaveJob<T>> & Pick<AutosaveJob<T>, "request">): AutosaveJob<T> => ({
  serialKey: "enr:1",
  cellKey: "1:t0",
  revert: () => {},
  ...overrides,
});

describe("errorMessageOf", () => {
  it("extracts response.data.error when present", () => {
    expect(errorMessageOf({ response: { data: { error: "Aula ocupada" } } })).toBe(
      "Aula ocupada",
    );
  });

  it("falls back to the default message when the shape doesn't match", () => {
    expect(errorMessageOf(new Error("network"))).toBe("Error de conexión al guardar");
    expect(errorMessageOf(undefined)).toBe("Error de conexión al guardar");
    expect(errorMessageOf(null)).toBe("Error de conexión al guardar");
    expect(errorMessageOf({})).toBe("Error de conexión al guardar");
    expect(errorMessageOf({ response: { data: {} } })).toBe("Error de conexión al guardar");
  });

  it("falls back when the error field is an empty string", () => {
    expect(errorMessageOf({ response: { data: { error: "" } } })).toBe(
      "Error de conexión al guardar",
    );
  });
});

describe("AutosaveQueue", () => {
  it("sets status to saving synchronously on enqueue and bumps pendingCount", () => {
    const statuses: CellSaveState[] = [];
    const queue = new AutosaveQueue({
      onStatus: (_cellKey, state) => statuses.push(state),
      onError: () => {},
      now: () => 42,
    });
    queue.enqueue(job({ request: () => new Promise<number>(() => {}) }));
    expect(statuses).toEqual([{ status: "saving", at: 42 }]);
    expect(queue.pendingCount()).toBe(1);
  });

  it("runs jobs with the same serialKey strictly one after another", async () => {
    const d1 = deferred<number>();
    const d2 = deferred<number>();
    const req2 = vi.fn(() => d2.promise);
    const queue = new AutosaveQueue({ onStatus: () => {}, onError: () => {} });

    queue.enqueue(job({ serialKey: "enr:1", cellKey: "1:t0", request: () => d1.promise }));
    queue.enqueue(job({ serialKey: "enr:1", cellKey: "1:t1", request: req2 }));

    await flush();
    expect(req2).not.toHaveBeenCalled();

    d1.resolve(1);
    await flush();
    expect(req2).toHaveBeenCalledTimes(1);

    d2.resolve(2);
    await queue.idle();
  });

  it("runs jobs with different serialKeys concurrently", async () => {
    const d1 = deferred<number>();
    const d2 = deferred<number>();
    const req1 = vi.fn(() => d1.promise);
    const req2 = vi.fn(() => d2.promise);
    const queue = new AutosaveQueue({ onStatus: () => {}, onError: () => {} });

    queue.enqueue(job({ serialKey: "enr:1", cellKey: "1:t0", request: req1 }));
    queue.enqueue(job({ serialKey: "enr:2", cellKey: "2:t0", request: req2 }));

    await flush();
    expect(req1).toHaveBeenCalledTimes(1);
    expect(req2).toHaveBeenCalledTimes(1);

    d1.resolve(1);
    d2.resolve(2);
    await queue.idle();
  });

  it("on success: applies onSuccess, then sets status saved, then calls onSaved", async () => {
    const d = deferred<{ id: number }>();
    const events: string[] = [];
    const onSuccess = vi.fn(() => events.push("onSuccess"));
    const onSaved = vi.fn(() => events.push("onSaved"));
    const queue = new AutosaveQueue({
      onStatus: (_cellKey, state) => events.push(`status:${state.status}`),
      onError: () => {},
      onSaved,
      now: () => 1000,
    });
    const j = job({ request: () => d.promise, onSuccess });

    queue.enqueue(j);
    d.resolve({ id: 5 });
    await queue.idle();

    expect(onSuccess).toHaveBeenCalledWith({ id: 5 });
    expect(onSaved).toHaveBeenCalledWith(j);
    expect(events).toEqual(["status:saving", "onSuccess", "status:saved", "onSaved"]);
  });

  it("on failure: reverts, sets status error with the message, and calls onError", async () => {
    const d = deferred<unknown>();
    const revert = vi.fn();
    const onError = vi.fn();
    const statuses: CellSaveState[] = [];
    const queue = new AutosaveQueue({
      onStatus: (_cellKey, state) => statuses.push(state),
      onError,
      now: () => 2000,
    });

    queue.enqueue(job({ request: () => d.promise, revert }));
    d.reject({ response: { data: { error: "Aula ocupada" } } });
    await queue.idle();

    expect(revert).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toEqual({ status: "error", message: "Aula ocupada", at: 2000 });
    expect(onError).toHaveBeenCalledWith("Aula ocupada");
  });

  it("stale failure: does not revert or emit an error status, but still reports the error", async () => {
    const dA = deferred<unknown>();
    const dB = deferred<{ id: number }>();
    const revertA = vi.fn();
    const onSuccessB = vi.fn();
    const onError = vi.fn();
    const statusesX: CellSaveState[] = [];
    const queue = new AutosaveQueue({
      onStatus: (cellKey, state) => {
        if (cellKey === "1:t0") statusesX.push(state);
      },
      onError,
    });

    queue.enqueue(job({ serialKey: "enr:A", cellKey: "1:t0", request: () => dA.promise, revert: revertA }));
    queue.enqueue(
      job({ serialKey: "enr:B", cellKey: "1:t0", request: () => dB.promise, onSuccess: onSuccessB }),
    );
    await flush();

    dA.reject({ response: { data: { error: "boom" } } });
    await flush();

    expect(revertA).not.toHaveBeenCalled();
    expect(statusesX.some((s) => s.status === "error")).toBe(false);
    expect(onError).toHaveBeenCalledWith("boom");

    dB.resolve({ id: 9 });
    await queue.idle();

    expect(onSuccessB).toHaveBeenCalledWith({ id: 9 });
    expect(statusesX.at(-1)).toMatchObject({ status: "saved" });
  });

  it("stale success: still applies onSuccess but does not emit a saved status", async () => {
    const dA = deferred<{ id: number }>();
    const dB = deferred<unknown>();
    const onSuccessA = vi.fn();
    const revertB = vi.fn();
    const statusesX: CellSaveState[] = [];
    const queue = new AutosaveQueue({
      onStatus: (cellKey, state) => {
        if (cellKey === "1:t0") statusesX.push(state);
      },
      onError: () => {},
    });

    queue.enqueue(
      job({ serialKey: "enr:A", cellKey: "1:t0", request: () => dA.promise, onSuccess: onSuccessA }),
    );
    queue.enqueue(job({ serialKey: "enr:B", cellKey: "1:t0", request: () => dB.promise, revert: revertB }));
    await flush();

    dA.resolve({ id: 3 });
    await flush();

    expect(onSuccessA).toHaveBeenCalledWith({ id: 3 });
    expect(statusesX.some((s) => s.status === "saved")).toBe(false);

    dB.reject({ response: { data: { error: "x" } } });
    await queue.idle();

    expect(revertB).toHaveBeenCalledTimes(1);
  });

  it("a failed predecessor does not block its successor in the same chain", async () => {
    const d1 = deferred<unknown>();
    const d2 = deferred<{ ok: true }>();
    const req2 = vi.fn(() => d2.promise);
    const revert1 = vi.fn();
    const queue = new AutosaveQueue({ onStatus: () => {}, onError: () => {} });

    queue.enqueue(job({ serialKey: "enr:1", cellKey: "1:t0", request: () => d1.promise, revert: revert1 }));
    queue.enqueue(job({ serialKey: "enr:1", cellKey: "1:t1", request: req2 }));
    await flush();

    d1.reject({ response: { data: { error: "e" } } });
    await flush();

    expect(req2).toHaveBeenCalledTimes(1);
    expect(revert1).toHaveBeenCalledTimes(1);

    d2.resolve({ ok: true });
    await queue.idle();
  });

  it("idle() resolves immediately when nothing is pending", async () => {
    const queue = new AutosaveQueue({ onStatus: () => {}, onError: () => {} });
    await expect(queue.idle()).resolves.toBeUndefined();
  });

  it("idle() resolves only after every enqueued job has settled", async () => {
    const d = deferred<unknown>();
    const queue = new AutosaveQueue({ onStatus: () => {}, onError: () => {} });
    queue.enqueue(job({ request: () => d.promise }));

    let resolved = false;
    const p = queue.idle().then(() => {
      resolved = true;
    });
    await flush();
    expect(resolved).toBe(false);

    d.resolve(1);
    await p;
    expect(resolved).toBe(true);
  });

  it("pendingCount() tracks enqueued-but-unsettled jobs", async () => {
    const d1 = deferred<unknown>();
    const d2 = deferred<unknown>();
    const queue = new AutosaveQueue({ onStatus: () => {}, onError: () => {} });

    expect(queue.pendingCount()).toBe(0);
    queue.enqueue(job({ serialKey: "enr:1", cellKey: "1:t0", request: () => d1.promise }));
    expect(queue.pendingCount()).toBe(1);
    queue.enqueue(job({ serialKey: "enr:2", cellKey: "2:t0", request: () => d2.promise }));
    expect(queue.pendingCount()).toBe(2);

    d1.resolve(1);
    await flush();
    expect(queue.pendingCount()).toBe(1);

    d2.resolve(2);
    await queue.idle();
    expect(queue.pendingCount()).toBe(0);
  });
});
