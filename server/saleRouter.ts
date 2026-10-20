import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { products, saleItems, sales, shopMembers, stockMovements } from "../drizzle/schema";
import { getDb } from "./db";
import { calculateSaleTotal, decimalToMilliUnits, milliUnitsToDecimal } from "./saleMath";
import { protectedProcedure, router } from "./_core/trpc";

const shopIdSchema = z.number().int().positive();
const saleInputSchema = z.object({
  shopId: shopIdSchema,
  clientSaleId: z.string().trim().min(8).max(128),
  paymentMethod: z.enum(["cash", "card", "transfer", "credit", "mixed"]).default("cash"),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(100_000),
  })).min(1).max(100).superRefine((items, ctx) => {
    const ids = new Set<number>();
    items.forEach((item, index) => {
      if (ids.has(item.productId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "productId"], message: "Each product may appear only once per sale." });
      }
      ids.add(item.productId);
    });
  }),
});

async function requireShopRole(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, shopId: number, userId: number) {
  const [membership] = await db.select({ role: shopMembers.role })
    .from(shopMembers)
    .where(and(eq(shopMembers.shopId, shopId), eq(shopMembers.userId, userId)))
    .limit(1);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this shop." });
  return membership;
}

export const saleRouter = router({
  checkout: protectedProcedure
    .input(saleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });
      const membership = await requireShopRole(db, input.shopId, ctx.user.id);
      if (!["owner", "manager", "cashier"].includes(membership.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot complete sales." });
      }

      try {
        return await db.transaction(async tx => {
          const [existing] = await tx.select({
            id: sales.id,
            shopId: sales.shopId,
            clientSaleId: sales.clientSaleId,
            subtotal: sales.subtotal,
            total: sales.total,
            paymentMethod: sales.paymentMethod,
            createdAt: sales.createdAt,
          }).from(sales).where(and(
            eq(sales.shopId, input.shopId),
            eq(sales.clientSaleId, input.clientSaleId),
          )).limit(1);
          if (existing) return { ...existing, duplicate: true };

          const requestedIds = input.items.map(item => item.productId);
          const foundProducts = await tx.select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            price: products.price,
            stock: products.stock,
            status: products.status,
          }).from(products).where(and(
            eq(products.shopId, input.shopId),
            inArray(products.id, requestedIds),
          ));
          const byId = new Map(foundProducts.map(product => [product.id, product]));
          if (foundProducts.length !== input.items.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "One or more products do not belong to this shop." });
          }
          for (const item of input.items) {
            const product = byId.get(item.productId)!;
            if (product.status !== "active") {
              throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Product "${product.name}" is archived.` });
            }
            if (product.stock < item.quantity) {
              throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Insufficient stock for "${product.name}". Available: ${product.stock}.` });
            }
          }

          const saleRows = input.items.map(item => {
            const product = byId.get(item.productId)!;
            return {
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              quantity: item.quantity,
              unitPrice: product.price,
              lineTotal: milliUnitsToDecimal(decimalToMilliUnits(product.price) * BigInt(item.quantity)),
            };
          });
          const total = calculateSaleTotal(saleRows.map(item => ({ price: item.unitPrice, quantity: item.quantity })));
          const inserted = await tx.insert(sales).values({
            shopId: input.shopId,
            clientSaleId: input.clientSaleId,
            createdBy: ctx.user.id,
            subtotal: total,
            total,
            paymentMethod: input.paymentMethod,
            status: "completed",
          });
          const saleId = Number(inserted[0].insertId);

          await tx.insert(saleItems).values(saleRows.map(item => ({
            saleId,
            shopId: input.shopId,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })));

          for (const item of input.items) {
            const product = byId.get(item.productId)!;
            const updateResult = await tx.update(products)
              .set({ stock: sql`${products.stock} - ${item.quantity}` })
              .where(and(
                eq(products.id, item.productId),
                eq(products.shopId, input.shopId),
                eq(products.status, "active"),
                gte(products.stock, item.quantity),
              ));
            if (Number(updateResult[0].affectedRows ?? 0) !== 1) {
              throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Stock changed during checkout for "${product.name}". Please retry the sale.` });
            }
            await tx.insert(stockMovements).values({
              shopId: input.shopId,
              productId: item.productId,
              userId: ctx.user.id,
              quantityDelta: -item.quantity,
              reason: "sale",
              referenceId: String(saleId),
              note: `Sale ${input.clientSaleId}`,
            });
          }

          return {
            id: saleId,
            shopId: input.shopId,
            clientSaleId: input.clientSaleId,
            subtotal: total,
            total,
            paymentMethod: input.paymentMethod,
            createdAt: new Date(),
            duplicate: false,
          };
        });
      } catch (error) {
        // A concurrent retry may win the unique key after our first read. Only
        // return a duplicate result when the exact idempotency key now exists.
        const [existing] = await db.select({
          id: sales.id,
          shopId: sales.shopId,
          clientSaleId: sales.clientSaleId,
          subtotal: sales.subtotal,
          total: sales.total,
          paymentMethod: sales.paymentMethod,
          createdAt: sales.createdAt,
        }).from(sales).where(and(
          eq(sales.shopId, input.shopId),
          eq(sales.clientSaleId, input.clientSaleId),
        )).limit(1);
        if (existing) return { ...existing, duplicate: true };
        throw error;
      }
    }),

  recent: protectedProcedure
    .input(z.object({ shopId: shopIdSchema, limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database is unavailable." });
      await requireShopRole(db, input.shopId, ctx.user.id);
      return db.select({
        id: sales.id,
        clientSaleId: sales.clientSaleId,
        subtotal: sales.subtotal,
        total: sales.total,
        paymentMethod: sales.paymentMethod,
        status: sales.status,
        createdAt: sales.createdAt,
      }).from(sales)
        .where(eq(sales.shopId, input.shopId))
        .orderBy(desc(sales.createdAt))
        .limit(input.limit);
    }),
});

export type SaleRouter = typeof saleRouter;
