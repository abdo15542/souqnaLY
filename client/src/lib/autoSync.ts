import { createLocalSyncOutbox, syncPendingOperations, type SyncBatchSummary } from "./syncEngine";
import { readLocalRecord, writeLocalRecord } from "./localDb";
import { createAuthenticatedSyncTransport } from "./syncTransport";

const QUEUE_CHANGED_EVENT = "souqna:sync-queue-changed";
let stopCurrentSync: (() => void) | undefined;

/**
 * Starts best-effort automatic delivery of queued operations when the browser
 * is online, returns to the app, or a new operation is enqueued. Safe to call
 * more than once. This does not create domain operations by itself.
 */
export function startAutomaticSync(onResult?: (summary: SyncBatchSummary) => void): () => void {
  if (stopCurrentSync) return stopCurrentSync;

  const store = createLocalSyncOutbox(readLocalRecord, writeLocalRecord);
  const transport = createAuthenticatedSyncTransport();
  let inFlight = false;
  let stopped = false;

  const run = async () => {
    if (stopped || inFlight || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    inFlight = true;
    try {
      const summary = await syncPendingOperations(store, transport);
      if (!stopped) onResult?.(summary);
    } finally {
      inFlight = false;
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") void run();
  };

  window.addEventListener("online", run);
  window.addEventListener("focus", run);
  window.addEventListener(QUEUE_CHANGED_EVENT, run);
  document.addEventListener("visibilitychange", onVisibility);
  void run();

  const stop = () => {
    stopped = true;
    window.removeEventListener("online", run);
    window.removeEventListener("focus", run);
    window.removeEventListener(QUEUE_CHANGED_EVENT, run);
    document.removeEventListener("visibilitychange", onVisibility);
    if (stopCurrentSync === stop) stopCurrentSync = undefined;
  };
  stopCurrentSync = stop;
  return stop;
}
