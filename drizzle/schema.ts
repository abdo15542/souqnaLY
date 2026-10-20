import { int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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