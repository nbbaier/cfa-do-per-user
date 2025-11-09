import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type { notes } from "./notes";
import type * as schema from "./schemas";

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;
export type DB = DrizzleSqliteDODatabase<typeof schema>;
