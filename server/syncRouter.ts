import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { syncOperations } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";

const MAX_OPERATION_PAYLOAD_BYTES = 100_000;
const MAX_BATCH_BYTES = 1_000_000;

function jsonByteLength(value: unknown): number | null {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return null;
    return new TextEncoder().encode(serialized).byteLength;
  } catch {
    return null;
  }
}

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
  payload: z.unknown().refine(value => {
    const size = jsonByteLength(value);
    return size !== null && size <= MAX_OPERATION_PAYLOAD_BYTES;
  }, "Payload must be valid JSON and no larger than 100 KB"),
  createdAt: z.string().min(1).max(40).refine(value => Number.isFinite(Date.parse(value)), "Invalid createdAt timestamp"),
  updatedAt: z.string().min(1).max(40).refine(value => Number.isFinite(Date.parse(value)), "Invalid updatedAt timestamp"),
  attemptCount: z.number().int().min(0).max(1_000_000).optional(),
  lastError: z.string().max(2000).optional(),
});

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
};

export const syncRouter = router({
  /**
   * Persist device operations in a per-user inbox before acknowledging them.
   * Retries with the same ID and same content are safe; reusing an ID for
   * different content is reported as a conflict rather than silently accepted.
   * Payload and batch limits protect the inbox from oversized requests.
   */
  push: protectedProcedure
    .input(z.object({
      operations: z.array(operationSchema).min(1).max(50).superRefine((operations, ctx) => {
        const size = jsonByteLength(operations);
        if (size === null) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sync batch must be valid JSON" });
        } else if (size > MAX_BATCH_BYTES) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sync batch must not exceed 1 MB" });
        }
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Sync storage is unavailable; operations remain on this device." });
      }

      const seen = new Set<string>();
      for (const operation of input.operations) {
        if (seen.has(operation.id)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A sync batch cannot contain duplicate operation IDs." });
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
          stableJson(row.payload) === stableJson(operation.payload) &&
          Math.floor(new Date(row.clientCreatedAt).getTime() / 1000) === Math.floor(Date.parse(operation.createdAt) / 1000);

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
