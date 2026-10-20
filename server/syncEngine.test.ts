import { describe, expect, it } from "vitest";
import {
  createSyncOperation,
  enqueueSyncOperation,
  syncPendingOperations,
  type SyncOperation,
  type SyncOutboxStore,
} from "../client/src/lib/syncEngine";

function memoryStore(initial: SyncOperation[] = []): SyncOutboxStore {
  let operations = [...initial];
  return {
    async read() { return operations.map(item => ({ ...item })); },
    async write(next) { operations = next.map(item => ({ ...item })); },
  };
}

describe("offline-first synchronization outbox", () => {
  it("creates a stable operation envelope with a client-generated id", () => {
    const operation = createSyncOperation("sale.create", "sale-42", { total: 19.5 }, new Date("2026-01-02T03:04:05.000Z"), "device-a-op-1");
    expect(operation).toMatchObject({
      id: "device-a-op-1",
      kind: "sale.create",
      entityId: "sale-42",
      payload: { total: 19.5 },
      createdAt: "2026-01-02T03:04:05.000Z",
      attemptCount: 0,
    });
  });

  it("does not append the same idempotency key twice", async () => {
    const store = memoryStore();
    const operation = createSyncOperation("sale.create", "sale-42", {}, new Date(), "same-id");
    expect(await enqueueSyncOperation(store, operation)).toEqual({ inserted: true, pending: 1 });
    expect(await enqueueSyncOperation(store, operation)).toEqual({ inserted: false, pending: 1 });
    expect((await store.read()).map(item => item.id)).toEqual(["same-id"]);
  });

  it("removes only operations explicitly acknowledged by the server", async () => {
    const first = createSyncOperation("sale.create", "sale-1", {}, new Date(), "one");
    const second = createSyncOperation("stock.adjust", "product-2", {}, new Date(), "two");
    const store = memoryStore([first, second]);
    const summary = await syncPendingOperations(store, async () => ({
      acknowledgedIds: ["one"],
    }));
    expect(summary).toMatchObject({ attempted: 2, acknowledged: 1, remaining: 1, failed: 1 });
    expect((await store.read()).map(item => item.id)).toEqual(["two"]);
    expect((await store.read())[0].lastError).toContain("did not acknowledge");
  });

  it("preserves all pending operations after a network failure and records retry metadata", async () => {
    const operation = createSyncOperation("sale.create", "sale-1", {}, new Date(), "retry-me");
    const store = memoryStore([operation]);
    const summary = await syncPendingOperations(store, async () => { throw new Error("offline"); });
    expect(summary).toMatchObject({ attempted: 1, acknowledged: 0, remaining: 1, failed: 1 });
    expect(await store.read()).toMatchObject([{ id: "retry-me", attemptCount: 1, lastError: "offline" }]);
  });

  it("keeps non-retryable conflicts in the outbox instead of discarding them", async () => {
    const operation = createSyncOperation("stock.adjust", "product-1", { quantity: 2 }, new Date(), "conflict");
    const store = memoryStore([operation]);
    await syncPendingOperations(store, async () => ({
      acknowledgedIds: [],
      rejected: [{ id: "conflict", reason: "stock version changed", retryable: false }],
    }));
    expect(await store.read()).toMatchObject([{
      id: "conflict",
      lastError: "Conflict requires resolution: stock version changed",
    }]);
  });

  it("rejects operations without an entity id", () => {
    expect(() => createSyncOperation("sale.create", " ", {})).toThrow("entityId is required");
  });
});
