import { Hono } from "hono";

export * from "./do";

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

app.get("/kv", async (c) => {
	const key = "hello";
	const value = `world@${Date.now()}`;
	await c.env.CACHE.put(key, value);
	const got = await c.env.CACHE.get(key);
	return c.json({ key, value: got });
});

export default app;
