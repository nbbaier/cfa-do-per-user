import { DurableObject } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Hono } from "hono";
import type { worker } from "../alchemy.run";
import migrations from "../drizzle/migrations";
import { createNote, deleteNote, getNote, listNotes } from "./db";
import { notes } from "./db/schema";
import type { DB } from "./db/types";

function getDurableDatabaseStub(env: Env, userId: string) {
  const doId = env.DO.idFromName(userId);
  return env.DO.get(doId);
}

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.text("Hello Hono!"));

app.get("/do", async (c) => {
  const id = c.env.DO.idFromName("hello-world");
  const obj = c.env.DO.get(id);
  const msg = await obj.fetch(new Request("https://example.com"));
  return msg;
});

app.post("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const { text } = await c.req.json();
  const stub = getDurableDatabaseStub(c.env, userId);
  const note = await stub.notesCreate({ text });
  return c.json({ note });
});

app.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const stub = getDurableDatabaseStub(c.env, userId);
  const notes = await stub.notesList();
  return c.json({ notes });
});

app.get("/:userId/:noteId", async (c) => {
  const userId = c.req.param("userId");
  const noteId = c.req.param("noteId");
  const stub = getDurableDatabaseStub(c.env, userId);
  const note = await stub.notesGet(noteId);
  if (!note) {
    return c.notFound();
  }
  return c.json({ note });
});

app.delete("/:userId/:noteId", async (c) => {
  const userId = c.req.param("userId");
  const noteId = c.req.param("noteId");
  const stub = getDurableDatabaseStub(c.env, userId);
  const note = await stub.notesDelete(noteId);
  return c.json({ note });
});

export default app;

export class DurableDatabase extends DurableObject {
  private readonly db: DB;

  constructor(ctx: DurableObjectState, env: typeof worker.Env) {
    super(ctx, env);

    this.db = drizzle(ctx.storage, { schema: { notes }, logger: true });
    ctx.blockConcurrencyWhile(async () => {
      await this._migrate();
    });
  }

  async notesCreate(
    note: Parameters<typeof createNote>[1]
  ): ReturnType<typeof createNote> {
    return await createNote(this.db, note);
  }

  async notesGet(
    id: Parameters<typeof getNote>[1]
  ): ReturnType<typeof getNote> {
    return await getNote(this.db, id);
  }

  async notesList(): ReturnType<typeof listNotes> {
    return await listNotes(this.db);
  }

  async notesDelete(
    id: Parameters<typeof deleteNote>[1]
  ): ReturnType<typeof deleteNote> {
    return await deleteNote(this.db, id);
  }

  private async _migrate() {
    await migrate(this.db, migrations);
  }

  // biome-ignore lint/suspicious/useAwait: this is a Durable Object
  async fetch(_request: Request): Promise<Response> {
    return Response.json({ message: "Hello World from Durable Object!" });
  }
}
