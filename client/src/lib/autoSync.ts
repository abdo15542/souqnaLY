import { createLocalSyncOutbox, syncPendingOperations, type SyncBatchSummary } from "./syncEngine";
import { readLocalRecord, writeLocalRecord } from "./localDb";
import { createAuthenticatedSyncTransport } from "./syncTransport";

const QUEUE_CHANGED_EVENT = "souqna:sync-queue-changed";
export const SYNC_STATUS_EVENT = "souqna:sync-status";
function emitSyncStatus(detail: { state: "syncing" | "idle" | "error"; summary?: SyncBatchSummary; message?: string }) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail }));
}
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
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelayMs = 5_000;

  const scheduleRetry = () => {
    if (stopped || retryTimer || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void run();
    }, retryDelayMs);
    retryDelayMs = Math.min(retryDelayMs * 2, 5 * 60_000);
  };

  const run = async () => {
    if (stopped || inFlight || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    inFlight = true;
    emitSyncStatus({ state: "syncing" });
    try {
      const summary = await syncPendingOperations(store, transport);
      if (!stopped) {
        onResult?.(summary);
        emitSyncStatus({ state: summary.failed > 0 ? "error" : "idle", summary });
        if (summary.failed > 0 || summary.remaining > 0) scheduleRetry();
        else retryDelayMs = 5_000;
      }
    } catch (error) {
      emitSyncStatus({ state: "error", message: error instanceof Error ? error.message : "تعذرت المزامنة" });
      scheduleRetry();
    } finally {
      inFlight = false;
    }
  };

  const onOnline = () => {
    retryDelayMs = 5_000;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = undefined;
    void run();
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = undefined; }
      void run();
    }
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("focus", run);
  window.addEventListener(QUEUE_CHANGED_EVENT, run);
  document.addEventListener("visibilitychange", onVisibility);
  void run();

  const stop = () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = undefined;
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", run);
    window.removeEventListener(QUEUE_CHANGED_EVENT, run);
    document.removeEventListener("visibilitychange", onVisibility);
    if (stopCurrentSync === stop) stopCurrentSync = undefined;
  };
  stopCurrentSync = stop;
  return stop;
}
