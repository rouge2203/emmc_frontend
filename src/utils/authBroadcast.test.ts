import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { broadcastLogin, subscribeToLogin } from "./authBroadcast";

const CHANNEL_NAME = "emmc-auth";
const STORAGE_KEY = "emmc-auth-login";

/** Minimal BroadcastChannel stand-in: delivers postMessage to every other
 * live instance sharing the same channel name (real BroadcastChannel never
 * delivers to the sender itself). */
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];

  name: string;
  private listeners = new Set<(event: { data: unknown }) => void>();

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(type: string, listener: (event: { data: unknown }) => void) {
    if (type === "message") this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: (event: { data: unknown }) => void) {
    if (type === "message") this.listeners.delete(listener);
  }

  postMessage(data: unknown) {
    for (const other of FakeBroadcastChannel.instances) {
      if (other === this || other.name !== this.name) continue;
      other.listeners.forEach((listener) => listener({ data }));
    }
  }

  close() {
    FakeBroadcastChannel.instances = FakeBroadcastChannel.instances.filter(
      (instance) => instance !== this,
    );
  }
}

/** In-memory Storage stand-in (Node has no real localStorage). Records every
 * value written (`writes`) so tests can assert successive pings differ. */
class FakeStorage {
  private store = new Map<string, string>();
  writes: string[] = [];

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.writes.push(value);
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

/** Minimal window stand-in supporting addEventListener("storage", ...) plus
 * localStorage, so `storage` events can be dispatched by hand in tests. */
class FakeWindow {
  localStorage = new FakeStorage();
  private listeners = new Set<(event: { type: string; key: string | null; newValue: string | null }) => void>();

  addEventListener(
    type: string,
    listener: (event: { type: string; key: string | null; newValue: string | null }) => void,
  ) {
    if (type === "storage") this.listeners.add(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: { type: string; key: string | null; newValue: string | null }) => void,
  ) {
    if (type === "storage") this.listeners.delete(listener);
  }

  dispatchEvent(event: { type: string; key: string | null; newValue: string | null }) {
    this.listeners.forEach((listener) => listener(event));
  }
}

let fakeWindow: FakeWindow;

beforeEach(() => {
  vi.useFakeTimers();
  FakeBroadcastChannel.instances = [];
  fakeWindow = new FakeWindow();
  vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
  vi.stubGlobal("window", fakeWindow);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("subscribeToLogin", () => {
  it("fires the callback on a BroadcastChannel message", () => {
    const received = vi.fn();
    subscribeToLogin(received);

    broadcastLogin();

    expect(received).toHaveBeenCalledTimes(1);
  });

  it("fires the callback on a matching storage event", () => {
    const received = vi.fn();
    subscribeToLogin(received);

    fakeWindow.dispatchEvent({ type: "storage", key: STORAGE_KEY, newValue: String(Date.now()) });

    expect(received).toHaveBeenCalledTimes(1);
  });

  it("fires only once when both transports deliver the same login (once-guard)", () => {
    const received = vi.fn();
    subscribeToLogin(received);

    broadcastLogin();
    fakeWindow.dispatchEvent({ type: "storage", key: STORAGE_KEY, newValue: String(Date.now()) });

    expect(received).toHaveBeenCalledTimes(1);
  });

  it("stops delivering after cleanup", () => {
    const received = vi.fn();
    const unsubscribe = subscribeToLogin(received);
    unsubscribe();

    broadcastLogin();
    fakeWindow.dispatchEvent({ type: "storage", key: STORAGE_KEY, newValue: String(Date.now()) });

    expect(received).not.toHaveBeenCalled();
  });

  it("ignores a storage event for an unrelated key", () => {
    const received = vi.fn();
    subscribeToLogin(received);

    fakeWindow.dispatchEvent({ type: "storage", key: "some-other-key", newValue: "1" });

    expect(received).not.toHaveBeenCalled();
  });

  it("ignores a storage event with a null newValue (e.g. the key being removed)", () => {
    const received = vi.fn();
    subscribeToLogin(received);

    fakeWindow.dispatchEvent({ type: "storage", key: STORAGE_KEY, newValue: null });

    expect(received).not.toHaveBeenCalled();
  });

  it("ignores a channel message that is not shaped like a login event", () => {
    const received = vi.fn();
    subscribeToLogin(received);

    const sender = new FakeBroadcastChannel(CHANNEL_NAME);
    sender.postMessage({ type: "logout" });
    sender.postMessage("just a string");

    expect(received).not.toHaveBeenCalled();
  });
});

describe("broadcastLogin", () => {
  it("pings localStorage and clears the key again shortly after", () => {
    broadcastLogin();

    expect(fakeWindow.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    vi.advanceTimersByTime(1000);

    expect(fakeWindow.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("is a no-op that does not throw when BroadcastChannel is unavailable", () => {
    vi.stubGlobal("BroadcastChannel", undefined);

    expect(() => broadcastLogin()).not.toThrow();
  });

  it("writes a distinct storage value on two rapid calls, even within the same millisecond", () => {
    // Regression: a plain `String(Date.now())` ping can write the exact
    // same value twice when two calls land in the same millisecond (or a
    // browser coarsens Date.now()), and the Storage spec fires no `storage`
    // event for an unchanged value. Freezing the clock reproduces that
    // window; the monotonic counter in broadcastLogin() must still make
    // the two writes differ.
    vi.setSystemTime(new Date(2024, 0, 1));

    broadcastLogin();
    broadcastLogin();

    const { writes } = fakeWindow.localStorage;
    expect(writes).toHaveLength(2);
    expect(writes[0]).not.toBe(writes[1]);
  });
});
