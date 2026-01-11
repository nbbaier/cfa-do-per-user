import { eq } from "drizzle-orm";
import { notes } from "./schema";
import type { DB, InsertNote, Note } from "./types";

export async function createNote(db: DB, note: InsertNote): Promise<Note> {
  const [res] = await db
    .insert(notes)
    .values(note)
    .onConflictDoUpdate({ target: [notes.id], set: note })
    .returning();
  return res;
}

export async function deleteNote(db: DB, id: string): Promise<Note> {
  const [note] = await db.delete(notes).where(eq(notes.id, id)).returning();
  return note;
}

export async function getNote(db: DB, id: string): Promise<Note | null> {
  const [result] = await db.select().from(notes).where(eq(notes.id, id));
  return result ? result : null;
}

export async function listNotes(db: DB): Promise<Note[]> {
  return await db.select().from(notes);
}
