# Per-User Durable Objects Notes API

[![Deployed with Alchemy](https://alchemy.run/alchemy-badge.svg)](https://alchemy.run)

A Cloudflare Workers application demonstrating per-user data isolation using Durable Objects with SQLite storage and Drizzle ORM.

## Features

-  **Per-user isolation**: Each user gets their own Durable Object instance with a dedicated SQLite database
-  **Hono routing**: Lightweight HTTP routing framework
-  **Drizzle ORM**: Type-safe database operations with automatic migrations
-  **Alchemy IaC**: TypeScript-native infrastructure as code

## API Endpoints

| Method   | Endpoint           | Description               |
| -------- | ------------------ | ------------------------- |
| `GET`    | `/`                | Health check              |
| `GET`    | `/do`              | Durable Object demo       |
| `POST`   | `/:userId`         | Create a note for a user  |
| `GET`    | `/:userId`         | List all notes for a user |
| `GET`    | `/:userId/:noteId` | Get a specific note       |
| `DELETE` | `/:userId/:noteId` | Delete a note             |

## Getting Started

### Prerequisites

-  [Bun](https://bun.sh) runtime
-  Cloudflare account with Workers enabled

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

### Deploy

```bash
bun run deploy
```

### Destroy

```bash
bun run destroy
```

## Project Structure

```
├── alchemy.run.ts       # Infrastructure definition (Worker, KV, Durable Objects)
├── src/
│   ├── worker.ts        # Hono app and DurableDatabase class
│   └── db/
│       ├── index.ts     # CRUD operations
│       ├── schema.ts    # Drizzle schema (notes table)
│       └── types.ts     # TypeScript types
├── drizzle/             # Generated migrations
└── wrangler.jsonc       # Wrangler configuration
```

## Schema

The `notes` table:

| Column    | Type    | Description                          |
| --------- | ------- | ------------------------------------ |
| `id`      | text    | UUID v7 primary key (auto-generated) |
| `text`    | text    | Note content                         |
| `created` | integer | Creation timestamp                   |
| `updated` | integer | Last update timestamp                |

## Usage Example

```bash
# Create a note
curl -X POST http://localhost:8787/user123 \
  -H "Content-Type: application/json" \
  -d '{"text": "My first note"}'

# List notes
curl http://localhost:8787/user123

# Get a specific note
curl http://localhost:8787/user123/<note-id>

# Delete a note
curl -X DELETE http://localhost:8787/user123/<note-id>
```
