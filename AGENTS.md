# Agent Guide

This repository is a small Cloudflare Workers example app that demonstrates per-user data isolation with Durable Objects, SQLite storage, Drizzle ORM, Hono, Alchemy, Ultracite/Biome, and Bun.

## Read This First

- The Worker entrypoint is `src/worker.ts`.
- `DurableDatabase` is exported from `src/worker.ts`; Cloudflare needs that class export for the Durable Object binding. Do not remove or hide it.
- Each `userId` maps to exactly one Durable Object ID via `env.DO.idFromName(userId)`. Treat that mapping as the application's data isolation boundary.
- The Durable Object owns its own SQLite database and initializes Drizzle with `drizzle(ctx.storage, { schema: { notes }, logger: true })`.
- Migrations run inside the Durable Object constructor through `ctx.blockConcurrencyWhile()` so requests cannot observe an unmigrated schema.
- Alchemy source in `alchemy.run.ts` generates `wrangler.jsonc`. Prefer changing Alchemy over manually editing generated Wrangler output unless the task is specifically about Wrangler compatibility.
- Production deploys use `CloudflareStateStore` in `alchemy.run.ts` to track infrastructure state.

## Source-Of-Truth Map

- `alchemy.run.ts` defines the Worker, Durable Object namespace, SQL text loader, Cloudflare state store, and generated Wrangler config.
- `src/worker.ts` contains all Hono routes plus the `DurableDatabase` class.
- `src/db/schema.ts` contains the Drizzle SQLite schema.
- `src/db/index.ts` contains focused CRUD helpers that accept a `DB`; keep these helpers free of routing and Durable Object binding logic.
- `src/db/types.ts` exports Drizzle-inferred database and row types.
- `drizzle/` contains generated SQL migrations plus `migrations.js`, which imports SQL files as text for runtime Durable Object migrations.
- `types/env.d.ts` derives the global Worker `Env` type from `typeof worker.Env`.
- `README.md` is user-facing overview/usage documentation; update it when API shape or setup commands change.
- `.github/copilot-instructions.md` is generic Ultracite guidance and currently mentions `bunx`; prefer this guide's package-script commands in this repo.

## Commands

Use Bun and package scripts:

```bash
bun run dev       # start the local worker through Alchemy
bun run typecheck # run TypeScript checks with no emitted output
bun run check     # run ultracite/biome checks
bun run fix       # apply automated ultracite/biome fixes
bun run deploy    # deploy or destroy Cloudflare resources through Alchemy
bun run destroy   # destroy all resources
```

- Prefer these scripts over direct `bunx ultracite ...` calls.
- If Alchemy regenerates `wrangler.jsonc`, review the generated diff before handing off.

## Runtime Flow

Current request flow:

```text
Hono route in src/worker.ts
  -> read userId from path
  -> env.DO.idFromName(userId)
  -> env.DO.get(id)
  -> DurableDatabase RPC method
  -> CRUD helper in src/db/index.ts
  -> per-object SQLite database via Drizzle
```

Current routes:

- `GET /` returns a health check string.
- `GET /do` exercises a fixed Durable Object instance.
- `POST /:userId` creates a note in that user's Durable Object database.
- `GET /:userId` lists notes for that user.
- `GET /:userId/:noteId` reads one note for that user.
- `DELETE /:userId/:noteId` deletes one note for that user.

Route handlers should keep the user isolation rule explicit: derive the Durable Object stub from `userId`, then delegate storage work to the Durable Object.

## Durable Object Constraints

- Define Durable Object bindings with `DurableObjectNamespace()` in Alchemy; do not `await` that call.
- Do not remove the `DurableDatabase` export from `src/worker.ts`.
- Do not move migrations out of `blockConcurrencyWhile()` unless you prove requests cannot observe an unmigrated database.
- Do not share a Drizzle database instance across Durable Object instances.
- Do not replace `idFromName(userId)` with random IDs for user data; that would break stable per-user storage.
- Keep the `DO` binding name in sync across Alchemy, generated Wrangler config, and Worker code.

## Schema And Migration Work

- Keep schema changes in `src/db/schema.ts`, then regenerate migrations under `drizzle/`.
- `drizzle/migrations.js` is part of the runtime migration bundle. If generated migration output changes, verify that this file imports every SQL file needed by `migrate(this.db, migrations)`.
- Migrations execute at runtime inside each Durable Object, not during deploy.
- The Alchemy Worker bundle config maps `.sql` files to text. Preserve that loader when changing build or infrastructure code.
- `drizzle.config.ts` currently points at `./src/db/schemas.ts`, but the checked-in schema file is `./src/db/schema.ts`. Fix that before relying on Drizzle Kit generation.

## Coding Standards

- Follow the existing TypeScript style: ESM imports, strict types, async/await, semicolons, double quotes, and small functions.
- Preserve binding type safety by deriving Worker environment types from `typeof worker.Env` where that pattern applies.
- Keep database operations in `src/db/index.ts` pure with respect to routing and bindings. They should accept a `DB` and return typed values.
- Keep route-level code thin. Validate/parse HTTP input there, resolve the Durable Object stub there, then call Durable Object methods.
- Avoid broad abstractions in this example app unless they remove real duplication or clarify the Durable Object boundary.
- Throw or return explicit errors for invalid input; do not silently accept malformed JSON or missing note fields if adding validation.
- Do not add React, browser UI guidance, or frontend-specific conventions unless a frontend is introduced.

## Documentation Notes

- Keep `README.md` and this guide aligned when routes, commands, project layout, or infrastructure ownership changes.
- The README's project tree may lag code comments; verify against actual files before copying it into agent-facing instructions.
- The generated `wrangler.jsonc` may change after Alchemy runs. If manual edits are unavoidable, explain why in the handoff.