import { decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Durable inbox for offline-first device operations.
 * The unique (userId, operationId) key makes retries idempotent per account.
 * Business effects are intentionally not claimed as applied until a worker
 * validates and processes these durable records.
 */
export const syncOperations = mysqlTable("sync_operations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  operationId: varchar("operationId", { length: 64 }).notNull(),
  kind: mysqlEnum("kind", [
    "product.upsert",
    "stock.adjust",
    "sale.create",
    "sale.return",
    "customer.upsert",
    "marketplace.listing.upsert",
    "marketplace.order.create",
  ]).notNull(),
  entityId: varchar("entityId", { length: 191 }).notNull(),
  payload: json("payload").$type<unknown>().notNull(),
  clientCreatedAt: timestamp("clientCreatedAt").notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["pending", "processed", "failed"]).default("pending").notNull(),
}, table => ({
  userOperationUnique: uniqueIndex("sync_operations_user_operation_unique").on(table.userId, table.operationId),
}));

export type SyncOperationRecord = typeof syncOperations.$inferSelect;

/** Shop tenancy boundary: all business data belongs to one shop. */
export const shops = mysqlTable("shops", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  currency: varchar("currency", { length: 3 }).default("LYD").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const shopMembers = mysqlTable("shop_members", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull().references(() => shops.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["owner", "manager", "cashier"]).default("cashier").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  shopUserUnique: uniqueIndex("shop_members_shop_user_unique").on(table.shopId, table.userId),
}));

/** Monetary values are DECIMAL strings to avoid floating-point price drift. */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull().references(() => shops.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }),
  name: varchar("name", { length: 191 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 3 }).notNull(),
  stock: int("stock").default(0).notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  shopSkuUnique: uniqueIndex("products_shop_sku_unique").on(table.shopId, table.sku),
  shopNameIdx: uniqueIndex("products_shop_name_unique").on(table.shopId, table.name),
}));

export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull().references(() => shops.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "restrict" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
  quantityDelta: int("quantityDelta").notNull(),
  reason: mysqlEnum("reason", ["restock", "sale", "return", "adjustment"]).notNull(),
  referenceId: varchar("referenceId", { length: 191 }),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
