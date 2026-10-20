import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { products, shopMembers, shops, stockMovements } from "../drizzle/schema";
import { getDb } from "./db";
import { protectedProcedure, router } from "./_core/trpc";

const shopIdSchema = z.number().int().positive();

function normalizeSlug(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
}

async function requireShopMembership(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, shopId: number, userId: number) {
  const [membership] = await db.select({ role: shopMembers.role })
    .from(shopMembers)
    .where(and(eq(shopMembers.shopId, shopId), eq(shopMembers.userId, userId)))
    .limit(1);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this shop." });
  return membership;
}

export const shopRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string().trim().min(2).max(160) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });

      const baseSlug = normalizeSlug(input.name) || "shop";
      const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
      const result = await db.transaction(async tx => {
        const inserted = await tx.insert(shops).values({
          ownerUserId: ctx.user.id,
          name: input.name,
          slug,
          currency: "LYD",
        });
        const shopId = Number(inserted[0].insertId);
        await tx.insert(shopMembers).values({ shopId, userId: ctx.user.id, role: "owner" });
        return { id: shopId, name: input.name, slug, currency: "LYD" };
      });
      return result;
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });
    return db.select({
      id: shops.id,
      name: shops.name,
      slug: shops.slug,
      currency: shops.currency,
      role: shopMembers.role,
    }).from(shopMembers)
      .innerJoin(shops, eq(shopMembers.shopId, shops.id))
      .where(eq(shopMembers.userId, ctx.user.id));
  }),

  products: protectedProcedure
    .input(z.object({ shopId: shopIdSchema }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });
      await requireShopMembership(db, input.shopId, ctx.user.id);
      return db.select().from(products)
        .where(and(eq(products.shopId, input.shopId), eq(products.status, "active")));
    }),

  stockHistory: protectedProcedure
    .input(z.object({
      shopId: shopIdSchema,
      productId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });
      await requireShopMembership(db, input.shopId, ctx.user.id);
      const conditions = [eq(stockMovements.shopId, input.shopId)];
      if (input.productId !== undefined) conditions.push(eq(stockMovements.productId, input.productId));
      return db.select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        userId: stockMovements.userId,
        quantityDelta: stockMovements.quantityDelta,
        reason: stockMovements.reason,
        referenceId: stockMovements.referenceId,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
      }).from(stockMovements)
        .innerJoin(products, eq(stockMovements.productId, products.id))
        .where(and(...conditions))
        .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
        .limit(input.limit);
    }),

  /** Full catalog for shop management, including archived items. POS should use products. */
  catalog: protectedProcedure
    .input(z.object({ shopId: shopIdSchema }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });
      await requireShopMembership(db, input.shopId, ctx.user.id);
      return db.select().from(products)
        .where(eq(products.shopId, input.shopId));
    }),

  updateProduct: protectedProcedure
    .input(z.object({
      shopId: shopIdSchema,
      productId: z.number().int().positive(),
      name: z.string().trim().min(1).max(191).optional(),
      sku: z.string().trim().max(100).nullable().optional(),
      description: z.string().max(5000).nullable().optional(),
      price: z.number().finite().min(0).max(999999999.999).optional(),
      status: z.enum(["active", "archived"]).optional(),
    }).refine(input => input.name !== undefined || input.sku !== undefined ||
      input.description !== undefined || input.price !== undefined || input.status !== undefined,
    "Provide at least one product field to update"))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });
      const membership = await requireShopMembership(db, input.shopId, ctx.user.id);
      if (membership.role === "cashier") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the shop owner or manager can edit products." });
      }

      const patch: Partial<typeof products.$inferInsert> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.sku !== undefined) patch.sku = input.sku || null;
      if (input.description !== undefined) patch.description = input.description || null;
      if (input.price !== undefined) patch.price = input.price.toFixed(3);
      if (input.status !== undefined) patch.status = input.status;

      const [existing] = await db.select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.shopId, input.shopId)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Product was not found in this shop." });

      await db.update(products).set(patch)
        .where(and(eq(products.id, input.productId), eq(products.shopId, input.shopId)));
      const [updated] = await db.select().from(products)
        .where(and(eq(products.id, input.productId), eq(products.shopId, input.shopId)))
        .limit(1);
      return updated;
    }),

  /** Apply a stock delta and write its audit row atomically. */
  adjustStock: protectedProcedure
    .input(z.object({
      shopId: shopIdSchema,
      productId: z.number().int().positive(),
      delta: z.number().int().min(-2_000_000_000).max(2_000_000_000).refine(value => value !== 0, "Stock adjustment cannot be zero"),
      note: z.string().trim().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });
      const membership = await requireShopMembership(db, input.shopId, ctx.user.id);
      if (membership.role === "cashier") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the shop owner or manager can adjust stock." });
      }

      return db.transaction(async tx => {
        const [product] = await tx.select({
          id: products.id,
          stock: products.stock,
          status: products.status,
          name: products.name,
        }).from(products).where(and(
          eq(products.id, input.productId),
          eq(products.shopId, input.shopId),
        )).limit(1);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product was not found in this shop." });
        if (product.status !== "active") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Archived products cannot have stock adjusted." });
        }
        const nextStock = product.stock + input.delta;
        if (nextStock < 0 || nextStock > 2_000_000_000) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stock adjustment would put inventory outside the allowed range." });
        }

        const stockBounds = input.delta < 0
          ? gte(products.stock, -input.delta)
          : lte(products.stock, 2_000_000_000 - input.delta);
        const changed = await tx.update(products)
          .set({ stock: sql`${products.stock} + ${input.delta}` })
          .where(and(
            eq(products.id, input.productId),
            eq(products.shopId, input.shopId),
            eq(products.status, "active"),
            stockBounds,
          ));
        if (Number(changed[0].affectedRows ?? 0) !== 1) {
          throw new TRPCError({ code: "CONFLICT", message: "Stock changed concurrently. Refresh and try again." });
        }

        await tx.insert(stockMovements).values({
          shopId: input.shopId,
          productId: input.productId,
          userId: ctx.user.id,
          quantityDelta: input.delta,
          reason: input.delta > 0 ? "restock" : "adjustment",
          note: input.note || (input.delta > 0 ? "Stock replenishment" : "Manual stock reduction"),
        });
        return { productId: input.productId, previousStock: product.stock, stock: nextStock, delta: input.delta };
      });
    }),

  createProduct: protectedProcedure
    .input(z.object({
      shopId: shopIdSchema,
      sku: z.string().trim().max(100).optional(),
      name: z.string().trim().min(1).max(191),
      description: z.string().max(5000).optional(),
      price: z.number().finite().min(0).max(999999999.999),
      initialStock: z.number().int().min(0).max(2_000_000_000).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });
      const membership = await requireShopMembership(db, input.shopId, ctx.user.id);
      if (membership.role === "cashier") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the shop owner or manager can add products." });
      }

      return db.transaction(async tx => {
        const inserted = await tx.insert(products).values({
          shopId: input.shopId,
          sku: input.sku || null,
          name: input.name,
          description: input.description || null,
          price: input.price.toFixed(3),
          stock: input.initialStock,
        });
        const productId = Number(inserted[0].insertId);
        if (input.initialStock > 0) {
          await tx.insert(stockMovements).values({
            shopId: input.shopId,
            productId,
            userId: ctx.user.id,
            quantityDelta: input.initialStock,
            reason: "adjustment",
            note: "Initial stock",
          });
        }
        return { id: productId, shopId: input.shopId, name: input.name, price: input.price.toFixed(3), stock: input.initialStock };
      });
    }),
});

export type ShopRouter = typeof shopRouter;
