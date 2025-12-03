# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Workers application built with Alchemy (TypeScript-native Infrastructure as Code) that demonstrates Durable Objects with SQLite storage using Drizzle ORM. The application implements a notes API where each user has their own isolated Durable Object instance with a SQLite database.

## Development Commands

```bash
# Deploy infrastructure to Cloudflare
bun run deploy

# Start local development server
bun run dev

# Destroy all deployed resources
bun run destroy

# Build TypeScript
bun run build

# Generate Drizzle migrations
drizzle-kit generate

# Push schema changes
drizzle-kit push
```

## Architecture

### Infrastructure Layer (alchemy.run.ts)

The infrastructure is defined using Alchemy, which manages:
- **Worker**: Main Cloudflare Worker exposing HTTP endpoints
- **KV Namespace**: Key-value storage bound as `CACHE`
- **Durable Object Namespace**: Manages `DurableDatabase` instances with SQLite
- **WranglerJson**: Generates wrangler.jsonc for local development compatibility

The Cloudflare State Store is used for production deployments to track infrastructure state.

### Application Layer (src/worker.ts)

**Hono-based Router**: The worker uses Hono for HTTP routing with the following endpoints:
- `GET /` - Health check
- `GET /do` - Direct Durable Object demo
- `POST /:userId` - Create note for user
- `GET /:userId` - List all notes for user
- `GET /:userId/:noteId` - Get specific note
- `DELETE /:userId/:noteId` - Delete note
- `GET /kv` - KV namespace demo

**DurableDatabase Class**: Each user gets a unique Durable Object instance identified by their userId. The Durable Object:
- Extends Cloudflare's `DurableObject` base class
- Initializes a Drizzle ORM connection to Durable Object SQLite storage
- Runs migrations on initialization using `blockConcurrencyWhile`
- Exposes methods that delegate to database operations in `src/db/index.ts`

### Database Layer

**Schema (src/db/schemas.ts & notes.ts)**: Defines the `notes` table with:
- `id`: UUID v7 primary key (auto-generated)
- `text`: Note content
- `created`: Timestamp with milliseconds
- `updated`: Auto-updating timestamp

**Operations (src/db/index.ts)**: Pure functions for CRUD operations:
- `create()` - Insert with upsert on conflict
- `get()` - Retrieve by ID
- `list()` - Retrieve all notes
- `del()` - Delete by ID

**Migrations**: Stored in `drizzle/` and bundled as JS module for runtime import. Generated SQL files are imported and executed during Durable Object initialization.

### Type Safety

- `src/db/types.ts` exports Drizzle-inferred types (`Note`, `InsertNote`, `DB`)
- The worker imports types from `alchemy.run.ts` using `typeof worker.Env` for binding type safety
- Drizzle schema is passed to the drizzle client for full type inference

## Key Implementation Details

**Durable Object Routing**: The `getDurableDatabaseStub()` helper creates a Durable Object stub using `idFromName(userId)`, ensuring each user's data is isolated in their own instance.

**Migration Strategy**: Migrations run during Durable Object construction within `blockConcurrencyWhile()` to prevent concurrent requests during schema updates.

**Bundle Configuration**: The Alchemy worker config includes a custom loader to import `.sql` files as text, allowing runtime migration execution.

**State Isolation**: Each Durable Object has its own SQLite database in Durable Object storage, providing strong consistency guarantees per user.

## Important Notes

- Always use `DurableObjectNamespace()` without `await` when defining Durable Object bindings
- The Durable Object class must be exported from the worker entrypoint file
- Migrations are bundled into the worker and executed at runtime, not during deployment
- User isolation is handled at the routing layer by deriving Durable Object IDs from userId
- The CloudflareStateStore tracks infrastructure state across deployments
