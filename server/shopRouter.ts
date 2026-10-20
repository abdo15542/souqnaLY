import { and, eq } from "drizzle-orm";
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
