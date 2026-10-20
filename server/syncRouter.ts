import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import { syncOperations } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";

const operationSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum([
    "product.upsert",
    "stock.adjust",
    "sale.create",
    "sale.return",
    "customer.upsert",
    "marketplace.listing.upsert",
    "marketplace.order.create",
  ]),
  entityId: z.string().trim().min(1).max(191),
  payload: z.unknown(),
  createdAt: z.string().min(1).max(40).refine(value => Number.isFinite(Date.parse(value)), "Invalid createdAt timestamp"),
  updatedAt: z.string().min(1).max(40).refine(value => Number.isFinite(Date.parse(value)), "Invalid updatedAt timestamp"),
  attemptCount: z.number().int().min(0).max(1_000_000).optional(),
  lastError: z.string().max(2000).optional(),
});

export const syncRouter = router({
  /**
   * Persist device operations in a per-user inbox before acknowledging them.
   * Retries with the same ID and same content are safe; reusing an ID for
   * different content is reported as a conflict rather than silently accepted.
   */
  push: protectedProcedure
    .input(z.object({ operations: z.array(operationSchema).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Sync storage is unavailable; operations remain on this device.");
      }

      const seen = new Set<string>();
      for (const operation of input.operations) {
        if (seen.has(operation.id)) {
          throw new Error("A sync batch cannot contain duplicate operation IDs.");
        }
        seen.add(operation.id);
      }

      const rows = input.operations.map(operation => ({
        userId: ctx.user.id,
        operationId: operation.id,
        kind: operation.kind,
        entityId: operation.entityId,
        payload: operation.payload,
        clientCreatedAt: new Date(operation.createdAt),
      }));

      // The no-op duplicate-key update is atomic and makes concurrent retries safe.
      await db.insert(syncOperations).values(rows).onDuplicateKeyUpdate({
        set: { operationId: sql`${syncOperations.operationId}` },
      });

      const stored = await db.select().from(syncOperations).where(and(
        eq(syncOperations.userId, ctx.user.id),
        inArray(syncOperations.operationId, input.operations.map(operation => operation.id)),
      ));

      const storedById = new Map(stored.map(row => [row.operationId, row]));
      const acknowledgedIds: string[] = [];
      const rejected: Array<{ id: string; reason: string; retryable: boolean }> = [];

      for (const operation of input.operations) {
        const row = storedById.get(operation.id);
        if (!row) {
          rejected.push({ id: operation.id, reason: "Operation was not durably stored.", retryable: true });
          continue;
        }
        const sameContent =
          row.kind === operation.kind &&
          row.entityId === operation.entityId &&
          JSON.stringify(row.payload) === JSON.stringify(operation.payload) &&
          new Date(row.clientCreatedAt).toISOString() === new Date(operation.createdAt).toISOString();

        if (sameContent) {
          acknowledgedIds.push(operation.id);
        } else {
          rejected.push({
            id: operation.id,
            reason: "This operation ID was already used with different content.",
            retryable: false,
          });
        }
      }

      return { acknowledgedIds, rejected };
    }),
});

export type SyncRouter = typeof syncRouter;
