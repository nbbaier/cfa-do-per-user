import { DurableObject } from "cloudflare:workers";
import type { worker } from "../alchemy.run";

export class HelloWorldDO extends DurableObject {
	private count: number;

	constructor(ctx: DurableObjectState, env: typeof worker.Env) {
		super(ctx, env);

		this.count = Number(this.ctx.storage.kv.get("count") || 0);
	}

	async increment() {
		this.count += 1;
		return this.count;
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
