import { DurableObject } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Hono } from "hono";
import type { worker } from "../alchemy.run";
import migrations from "../drizzle/migrations";
import * as notes from "./db/index";
import * as schema from "./db/schemas";
import type { DB } from "./db/types";

function getDurableDatabaseStub(env: Env, userId: string) {
	const doId = env.DO.idFromName(userId);
	return env.DO.get(doId);
}

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.get("/do", async (c) => {
	const id = c.env.DO.idFromName("hello-world");
	const obj = c.env.DO.get(id);
	const msg = await obj.fetch(new Request("https://example.com"));
	return msg;
});

app.get("/:userId", async (c) => {
	const userId = c.req.param("userId");
	const { text } = await c.req.json();
	const stub = getDurableDatabaseStub(c.env, userId);
	const note = await stub.notesCreate({ text });
	return c.json({ note });
});

app.post("/:userId", async (c) => {
	const userId = c.req.param("userId");
	const stub = getDurableDatabaseStub(c.env, userId);
	const notes = await stub.notesList();
	return c.json({ notes });
});

app.get("/:userId/:noteId", async (c) => {
	const userId = c.req.param("userId");
	const noteId = c.req.param("noteId");
	const stub = getDurableDatabaseStub(c.env, userId);
	const note = await stub.notesGet({ id: noteId });
	if (!note) {
		return c.notFound();
	}
	return c.json({ note });
});

app.delete("/:userId/:noteId", async (c) => {
	const userId = c.req.param("userId");
	const noteId = c.req.param("noteId");
	const stub = getDurableDatabaseStub(c.env, userId);
	const note = await stub.notesDelete({ id: noteId });
	return c.json({ note });
});

app.get("/kv", async (c) => {
	const key = "hello";
	const value = `world@${Date.now()}`;
	await c.env.CACHE.put(key, value);
	const got = await c.env.CACHE.get(key);
	return c.json({ key, value: got });
});

export default app;

export class DurableDatabase extends DurableObject {
	private count: number;
	private db: DB;

	constructor(ctx: DurableObjectState, env: typeof worker.Env) {
		super(ctx, env);

		this.count = Number(this.ctx.storage.kv.get("count") || 0);
		this.db = drizzle(ctx.storage, { schema, logger: true });
		ctx.blockConcurrencyWhile(async () => {
			await this._migrate();
		});
	}

	async increment() {
		this.count += 1;
		return this.count;
	}

	async notesCreate(
		note: Parameters<typeof notes.create>[1],
	): ReturnType<typeof notes.create> {
		return await notes.create(this.db, note);
	}

	async notesGet(
		params: Parameters<typeof notes.get>[1],
	): ReturnType<typeof notes.get> {
		return await notes.get(this.db, params);
	}

	async notesList(): ReturnType<typeof notes.list> {
		return await notes.list(this.db);
	}

	async notesDelete(
		params: Parameters<typeof notes.del>[1],
	): ReturnType<typeof notes.del> {
		return await notes.del(this.db, params);
	}

	private async _migrate() {
		await migrate(this.db, migrations);
	}

	async fetch(_request: Request): Promise<Response> {
		const count = await this.increment();

		return new Response(
			JSON.stringify({
				message: "Hello World from Durable Object!",
				count: count,
				timestamp: new Date().toISOString(),
			}),
			{
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
}
