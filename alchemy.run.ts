import alchemy from "alchemy";
import {
  DurableObjectNamespace,
  Worker,
  WranglerJson,
} from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import type { DurableDatabase } from "./src/worker";

const app = await alchemy("cfa-do-per-user", {
  stateStore: (scope) => new CloudflareStateStore(scope),
  adopt: true,
});

export const worker = await Worker("worker", {
  entrypoint: "src/worker.ts",
  bundle: { loader: { ".sql": "text" } },
  bindings: {
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
