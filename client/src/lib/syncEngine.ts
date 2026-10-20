/**
 * Offline-first synchronization outbox for Souqna LY.
 *
 * This module deliberately does not assume that a server endpoint exists.
 * The application must provide a transport connected to an authenticated,
 * idempotent backend before automatic cloud sync can be enabled.
 */
export type SyncOperationKind =
  | "product.upsert"
  | "stock.adjust"
  | "sale.create"
  | "sale.return"
  | "customer.upsert"
  | "marketplace.listing.upsert"
  | "marketplace.order.create";

export type SyncOperation<TPayload = unknown> = {
  /** Stable idempotency key generated once on the originating device. */
  id: string;
  kind: SyncOperationKind;
  entityId: string;
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  lastError?: string;
};

export type SyncOutboxStore = {
  read(): Promise<SyncOperation[]>;
  write(operations: SyncOperation[]): Promise<void>;
};

export type SyncPushResult = {
  /** IDs the server has durably accepted, not merely received. */
  acknowledgedIds: string[];
  rejected?: Array<{ id: string; reason: string; retryable: boolean }>;
};

export type SyncTransport = (operations: SyncOperation[]) => Promise<SyncPushResult>;

export type SyncBatchSummary = {
  attempted: number;
  acknowledged: number;
  remaining: number;
  failed: number;
};

const MAX_BATCH_SIZE = 50;
const storeLockTails = new WeakMap<SyncOutboxStore, Promise<void>>();

async function withStoreLock<T>(store: SyncOutboxStore, task: () => Promise<T>): Promise<T> {
  const previous = storeLockTails.get(store) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const tail = previous.then(() => gate, () => gate);
  storeLockTails.set(store, tail);
  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
  }
}

function makeOperationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Compatibility fallback; collision resistance is weaker than randomUUID.
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createSyncOperation<TPayload>(
  kind: SyncOperationKind,
  entityId: string,
  payload: TPayload,
  now = new Date(),
  id = makeOperationId(),
): SyncOperation<TPayload> {
  if (!entityId.trim()) throw new Error("entityId is required");
  return {
    id,
    kind,
    entityId,
    payload,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    attemptCount: 0,
  };
}

/** Serializes read-modify-write so concurrent enqueue calls cannot lose work. */
export async function enqueueSyncOperation(
  store: SyncOutboxStore,
  operation: SyncOperation,
): Promise<{ inserted: boolean; pending: number }> {
  return withStoreLock(store, async () => {
    const current = await store.read();
    if (current.some(item => item.id === operation.id)) {
      return { inserted: false, pending: current.length };
    }
    await store.write([...current, operation]);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("souqna:sync-queue-changed"));
    return { inserted: true, pending: current.length + 1 };
  });
}

/**
 * Sends a bounded batch. Only explicit server acknowledgements remove items.
 * Network errors, missing acknowledgements and retryable rejections stay local.
 * The network call runs outside the store lock; merging uses the latest queue
 * snapshot so operations added while the request is in flight are preserved.
 */
export async function syncPendingOperations(
  store: SyncOutboxStore,
  transport: SyncTransport,
): Promise<SyncBatchSummary> {
  const current = await withStoreLock(store, () => store.read());
  const batch = current.slice(0, MAX_BATCH_SIZE);
  if (batch.length === 0) {
    return { attempted: 0, acknowledged: 0, remaining: 0, failed: 0 };
  }
  const batchIds = new Set(batch.map(item => item.id));

  let result: SyncPushResult;
  try {
    result = await transport(batch);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    return withStoreLock(store, async () => {
      const latest = await store.read();
      await store.write(latest.map(item => batchIds.has(item.id)
        ? { ...item, attemptCount: item.attemptCount + 1, updatedAt: new Date().toISOString(), lastError: message }
        : item));
      return { attempted: batch.length, acknowledged: 0, remaining: latest.length, failed: batch.length };
    });
  }

  const acknowledgedIds = new Set(result.acknowledgedIds.filter(id => batchIds.has(id)));
  const rejections = new Map((result.rejected ?? []).map(item => [item.id, item]));

  return withStoreLock(store, async () => {
    const latest = await store.read();
    const remaining: SyncOperation[] = [];
    let failed = 0;

    for (const item of latest) {
      if (acknowledgedIds.has(item.id)) continue;
      const rejection = rejections.get(item.id);
      if (rejection && !rejection.retryable) {
        // Keep non-retryable conflicts visible for resolution; never silently drop them.
        remaining.push({
          ...item,
          attemptCount: item.attemptCount + 1,
          updatedAt: new Date().toISOString(),
          lastError: `Conflict requires resolution: ${rejection.reason}`,
        });
        failed++;
      } else if (batchIds.has(item.id)) {
        remaining.push({
          ...item,
          attemptCount: item.attemptCount + 1,
          updatedAt: new Date().toISOString(),
          lastError: rejection?.reason ?? "Server did not acknowledge operation",
        });
        failed++;
      } else {
        remaining.push(item);
      }
    }

    await store.write(remaining);
    return {
      attempted: batch.length,
      acknowledged: acknowledgedIds.size,
      remaining: remaining.length,
      failed,
    };
  });
}

/** Adapter backed by the existing IndexedDB/localStorage persistence layer. */
let cachedLocalOutbox: {
  readRecord: <T>(key: string) => Promise<T | null>;
  writeRecord: <T>(key: string, value: T) => Promise<void>;
  store: SyncOutboxStore;
} | undefined;

export function createLocalSyncOutbox(
  readRecord: <T>(key: string) => Promise<T | null>,
  writeRecord: <T>(key: string, value: T) => Promise<void>,
): SyncOutboxStore {
  // Share one store identity so the per-store lock also protects concurrent
  // enqueue calls made by different app modules using the same persistence API.
  if (cachedLocalOutbox?.readRecord === readRecord && cachedLocalOutbox.writeRecord === writeRecord) {
    return cachedLocalOutbox.store;
  }
  const key = "souqna-sync-outbox-v1";
  const store: SyncOutboxStore = {
    async read() {
      return (await readRecord<SyncOperation[]>(key)) ?? [];
    },
    async write(operations) {
      await writeRecord(key, operations);
    },
  };
  cachedLocalOutbox = { readRecord, writeRecord, store };
  return store;
}
