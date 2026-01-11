import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";

export const notes = sqliteTable("notes", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  text: text("text").notNull(),
  created: integer("created", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updated: integer("updated", { mode: "timestamp_ms" })
    .$onUpdate(() => new Date())
    .notNull(),
});
