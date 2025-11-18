import alchemy from "alchemy";
import {
	DurableObjectNamespace,
	KVNamespace,
	Worker,
	WranglerJson,
} from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import type { DurableDatabase } from "./src/worker";

``;
const app = await alchemy("cfa-do-sql", {
	stateStore: (scope) => new CloudflareStateStore(scope),
});

const cache = await KVNamespace("cache", {
	title: `${app.name}-cache`,
	adopt: true,
});

export const worker = await Worker("worker", {
	entrypoint: "src/worker.ts",
	bundle: {
		loader: {
			".sql": "text",
		},
	},
	bindings: {
		CACHE: cache,
		DO: DurableObjectNamespace<DurableDatabase>("DurableDatabase", {
			className: "DurableDatabase",
			sqlite: true,
		}),
	},
});

await WranglerJson({
	worker,
	transform: {
		wrangler: (spec) => ({
			...spec,
			rules: [
				{
					type: "Text",
					pattern: "**",
					globs: ["**/*.sql"],
					fallthrough: true,
				},
			],
		}),
	},
});

console.log(worker.url);
await app.finalize();
