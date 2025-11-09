import alchemy from "alchemy";
import {
	DurableObjectNamespace,
	KVNamespace,
	Worker,
	WranglerJson,
} from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import type { HelloWorldDO } from "./src/worker.ts";

const app = await alchemy("cfa-do-sql", {
	stateStore: (scope) => new CloudflareStateStore(scope),
});

const cache = await KVNamespace("cache", {
	title: `${app.name}-cache`,
	adopt: true,
});

export const worker = await Worker("worker", {
	entrypoint: "src/worker.ts",
	bindings: {
		CACHE: cache,
		DO: DurableObjectNamespace<HelloWorldDO>("HelloWorldDO", {
			className: "HelloWorldDO",
			sqlite: true,
		}),
	},
});

await WranglerJson({ worker });

console.log(worker.url);

await app.finalize();
