import { describe, expect, it } from "vitest";
import {
  createSyncOperation,
  enqueueSyncOperation,
  syncPendingOperations,
  type SyncOperation,
  type SyncOutboxStore,
} from "./syncEngine";

function createMemoryStore(initial: SyncOperation[] = []) {
  let operations = [...initial];
  const store: SyncOutboxStore = {
    async read() {
      return [...operations];
    },
    async write(next) {
      operations = [...next];
    },
  };
  return { store, snapshot: () => [...operations] };
}

describe("offline sync outbox", () => {
  it("keeps the first payload when an operation ID is enqueued twice", async () => {
    const { store, snapshot } = createMemoryStore();
    const first = createSyncOperation("stock.adjust", "product-1", { delta: 2 }, new Date("2026-01-01T00:00:00.000Z"), "op-1");
    const duplicate = { ...first, payload: { delta: 99 } };

    await expect(enqueueSyncOperation(store, first)).resolves.toEqual({ inserted: true, pending: 1 });
    await expect(enqueueSyncOperation(store, duplicate)).resolves.toEqual({ inserted: false, pending: 1 });
    expect(snapshot()).toEqual([first]);
  });

  it("serializes concurrent enqueues so neither operation is lost", async () => {
    const { store, snapshot } = createMemoryStore();
    const first = createSyncOperation("product.upsert", "product-1", { name: "Milk" }, new Date("2026-01-01T00:00:00.000Z"), "op-1");
    const second = createSyncOperation("product.upsert", "product-2", { name: "Bread" }, new Date("2026-01-01T00:00:01.000Z"), "op-2");

    await Promise.all([
      enqueueSyncOperation(store, first),
      enqueueSyncOperation(store, second),
    ]);

    expect(snapshot().map(operation => operation.id).sort()).toEqual(["op-1", "op-2"]);
  });

  it("removes only acknowledged operations and retains conflicts and missing acknowledgements", async () => {
    const acknowledged = createSyncOperation("product.upsert", "product-1", { name: "Milk" }, new Date("2026-01-01T00:00:00.000Z"), "op-1");
    const conflict = createSyncOperation("stock.adjust", "product-2", { delta: 1 }, new Date("2026-01-01T00:00:01.000Z"), "op-2");
    const missing = createSyncOperation("sale.create", "sale-3", { total: "5.000" }, new Date("2026-01-01T00:00:02.000Z"), "op-3");
    const { store, snapshot } = createMemoryStore([acknowledged, conflict, missing]);

    await expect(syncPendingOperations(store, async () => ({
      acknowledgedIds: ["op-1", "not-in-this-batch"],
      rejected: [{ id: "op-2", reason: "conflicting version", retryable: false }],
    }))).resolves.toMatchObject({ attempted: 3, acknowledged: 1, remaining: 2, failed: 2 });

    const remaining = snapshot();
    expect(remaining.map(operation => operation.id).sort()).toEqual(["op-2", "op-3"]);
    expect(remaining.find(operation => operation.id === "op-2")?.lastError).toContain("Conflict requires resolution");
    expect(remaining.find(operation => operation.id === "op-3")?.lastError).toBe("Server did not acknowledge operation");
  });

  it("keeps queued work and records a retry after a transport failure", async () => {
    const operation = createSyncOperation("sale.create", "sale-1", { total: "12.500" }, new Date("2026-01-01T00:00:00.000Z"), "op-1");
    const { store, snapshot } = createMemoryStore([operation]);

    await expect(syncPendingOperations(store, async () => {
      throw new Error("offline");
    })).resolves.toMatchObject({ attempted: 1, acknowledged: 0, remaining: 1, failed: 1 });

    expect(snapshot()).toHaveLength(1);
    expect(snapshot()[0].attemptCount).toBe(1);
    expect(snapshot()[0].lastError).toBe("offline");
  });
});
