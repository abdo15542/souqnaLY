import { useCallback, useEffect, useState } from "react";
import { readLocalRecord } from "@/lib/localDb";
import { SYNC_STATUS_EVENT } from "@/lib/autoSync";
import type { SyncOperation, SyncBatchSummary } from "@/lib/syncEngine";

type SyncState = "checking" | "offline" | "syncing" | "synced" | "attention";

type SyncStatusEvent = {
  state: "syncing" | "idle" | "error";
  summary?: SyncBatchSummary;
  message?: string;
};

export default function SyncStatusIndicator() {
  const [state, setState] = useState<SyncState>(() => navigator.onLine ? "checking" : "offline");
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async () => {
    try {
      const queue = await readLocalRecord<SyncOperation[]>("souqna-sync-outbox-v1");
      setPending(Array.isArray(queue) ? queue.length : 0);
    } catch {
      setState("attention");
    }
  }, []);

  useEffect(() => {
    void refreshPending();

    const onOnline = () => {
      setState("checking");
      void refreshPending();
    };
    const onOffline = () => setState("offline");
    const onQueueChanged = () => void refreshPending();
    const onSyncStatus = (event: Event) => {
      const detail = (event as CustomEvent<SyncStatusEvent>).detail;
      if (!detail) return;
      if (detail.state === "syncing") {
        setState(navigator.onLine ? "syncing" : "offline");
        return;
      }
      if (detail.state === "error" || (detail.summary?.failed ?? 0) > 0) {
        setState(navigator.onLine ? "attention" : "offline");
      } else {
        setState(navigator.onLine ? "synced" : "offline");
      }
      void refreshPending();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("souqna:sync-queue-changed", onQueueChanged);
    window.addEventListener(SYNC_STATUS_EVENT, onSyncStatus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("souqna:sync-queue-changed", onQueueChanged);
      window.removeEventListener(SYNC_STATUS_EVENT, onSyncStatus);
    };
  }, [refreshPending]);

  const messages: Record<SyncState, string> = {
    checking: "جارٍ فحص المزامنة",
    offline: pending > 0 ? `دون اتصال · ${pending} عملية محفوظة` : "دون اتصال · العمل المحلي متاح",
    syncing: pending > 0 ? `جارٍ رفع ${pending} عملية` : "جارٍ التحقق من المزامنة",
    synced: pending > 0 ? `${pending} عملية بانتظار الرفع` : "تم رفع العمليات المحفوظة",
    attention: pending > 0 ? `تحتاج المزامنة إلى مراجعة · ${pending} عملية` : "تعذرت المزامنة · ستتم إعادة المحاولة",
  };
  const colors: Record<SyncState, string> = {
    checking: "#64748b",
    offline: "#b45309",
    syncing: "#2563eb",
    synced: "#15803d",
    attention: "#b91c1c",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      title="حالة حفظ العمليات ومزامنتها مع الخادم"
      style={{
        position: "fixed",
        zIndex: 9998,
        bottom: "12px",
        left: "12px",
        maxWidth: "calc(100vw - 24px)",
        padding: "7px 11px",
        borderRadius: "999px",
        background: "var(--background, #fff)",
        color: colors[state],
        border: "1px solid currentColor",
        boxShadow: "0 2px 12px rgba(0,0,0,.10)",
        fontSize: "12px",
        lineHeight: 1.4,
        direction: "rtl",
        pointerEvents: "none",
      }}
    >
      <span aria-hidden="true">{state === "synced" ? "●" : state === "syncing" ? "↻" : state === "offline" ? "◌" : "!"}</span>
      {" "}{messages[state]}
    </div>
  );
}
