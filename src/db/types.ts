import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type * as schema from "./schema";

export type DB = DrizzleSqliteDODatabase<typeof schema>;
export type Note = typeof schema.notes.$inferSelect;
export type InsertNote = typeof schema.notes.$inferInsert;
