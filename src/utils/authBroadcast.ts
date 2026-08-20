/**
 * Cross-tab login signalling.
 *
 * When a magic-link login completes in one tab, other tabs waiting on the
 * code-entry screen need to notice and offer a "Continuar al portal"
 * button. Two transports are used so this works even where
 * `BroadcastChannel` is unavailable (e.g. some private-mode browsers):
 *
 *  - A `BroadcastChannel` named "emmc-auth" carrying `{ type: "login" }`.
 *  - A `localStorage` ping on the "emmc-auth-login" key, which other tabs
 *    observe via the `window` `storage` event.
 *
 * Both `broadcastLogin` and `subscribeToLogin` are safe to call outside a
 * browser (SSR/tests): they feature-detect `window`, `localStorage`, and
 * `BroadcastChannel` before touching them.
 */

const CHANNEL_NAME = "emmc-auth";
const STORAGE_KEY = "emmc-auth-login";
const STORAGE_PING_CLEAR_DELAY_MS = 1000;

// Appended to the ping value so it strictly changes on every call, even
// when two calls land in the same millisecond (or a browser coarsens
// Date.now() for fingerprinting resistance). See the comment in
// broadcastLogin() for why this matters.
let pingSequence = 0;

interface LoginMessage {
  type: "login";
}

function isLoginMessage(data: unknown): data is LoginMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "login"
  );
}

/**
 * Notifies other tabs that login just completed.
 */
export function broadcastLogin(): void {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: "login" } satisfies LoginMessage);
    channel.close();
  }

  if (typeof window === "undefined") return;

  try {
    // Per the Storage spec, `setItem` with a value identical to what's
    // already stored fires no `storage` event in other tabs. Two calls to
    // broadcastLogin() close enough together can land in the same
    // `Date.now()` millisecond (and some browsers coarsen Date.now()
    // further for fingerprinting resistance), so the timestamp alone
    // isn't guaranteed to differ between successive pings. Appending a
    // monotonic counter guarantees the written string always changes,
    // so the storage event always fires on every call. This is a
    // fallback-robustness fix for the localStorage transport only —
    // BroadcastChannel (checked above) doesn't have this failure mode
    // and would usually still deliver in this window.
    pingSequence += 1;
    window.localStorage.setItem(STORAGE_KEY, `${Date.now()}:${pingSequence}`);

    // Removing the key shortly after each ping just keeps it from
    // lingering in localStorage — it is not what makes the event fire
    // (the monotonic counter above is what guarantees that).
    setTimeout(() => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Private-mode / storage disabled mid-flight — nothing to clean up.
      }
    }, STORAGE_PING_CLEAR_DELAY_MS);
  } catch {
    // Private-mode browsers (e.g. Safari) can throw on localStorage access.
  }
}

/**
 * Subscribes to a login signal broadcast from another tab, on both
 * transports. `callback` fires at most once per subscription, even though
 * both transports will usually deliver the same login.
 *
 * Returns a cleanup function that closes the channel and removes the
 * window listener.
 */
export function subscribeToLogin(callback: () => void): () => void {
  let fired = false;
  const fireOnce = () => {
    if (fired) return;
    fired = true;
    callback();
  };

  let channel: BroadcastChannel | null = null;
  const handleMessage = (event: MessageEvent) => {
    if (isLoginMessage(event.data)) {
      fireOnce();
    }
  };

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", handleMessage);
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue != null) {
      fireOnce();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    if (channel) {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}
