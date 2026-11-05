---
title: Programmatic API
description: Embed yRest directly in Vitest, Playwright and other test frameworks with createYrestServer
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

The programmatic API lets you start and stop a yRest server from inside your test suite or any Node.js script — no CLI, no separate process. Import `createYrestServer`, pass a config object, and use the running server URL in your tests.

```ts
import { createYrestServer } from "@yrest/cli";

const server = createYrestServer({ file: "./tests/db.yml", port: 3070 });
await server.start();
// run tests against http://localhost:3070
await server.stop();
```

## Installation

## createYrestServer(options)

### Options reference

| Option     | Type      | Default       | Description                     |
| ---------- | --------- | ------------- | ------------------------------- |
| `file`     | `string`  | —             | Path to the YAML database file  |
| `port`     | `number`  | `3070`        | Port to listen on               |
| `host`     | `string`  | `"localhost"` | Host to bind                    |
| `base`     | `string`  | `""`          | URL prefix for all routes       |
| `readonly` | `boolean` | `false`       | Reject all write operations     |
| `delay`    | `number`  | `0`           | Simulated latency in ms         |
| `snapshot` | `boolean` | `false`       | Enable snapshot/reset endpoints |

### Return value — YrestServer

## Lifecycle methods

### server.start()

### server.stop()

## Typed collection access

`server.collection<T>(name)` returns a typed CRUD handle over the running data. Use it to seed or inspect state in a test without going through HTTP:

```ts
import { createYrestServer } from "@yrest/cli";
import type { User } from "./db.types"; // from `yrest types db.yml -o db.types.ts`

const server = createYrestServer({ file: "./tests/db.yml", port: 0 });
await server.start();

const users = server.collection<User>("users");
users.create({ name: "Ana", email: "ana@test.com" }); // id assigned by the server

const res = await fetch(`${server.url}/users`);
expect(await res.json()).toHaveLength(users.count());
```

| Method              | Returns          | Description                                         |
| ------------------- | ---------------- | --------------------------------------------------- |
| `findAll()`         | `T[]`            | Every item, in stored order                         |
| `findById(id)`      | `T \| undefined` | Item by id — `1` and `"1"` both match               |
| `findWhere(fn)`     | `T[]`            | Items for which the predicate returns `true`        |
| `count()`           | `number`         | Number of items                                     |
| `create(data)`      | `T`              | Adds an item; the id is generated when omitted      |
| `update(id, patch)` | `T \| undefined` | Merges `patch` into the item (the id cannot change) |
| `delete(id)`        | `T \| undefined` | Removes the item and returns it                     |

- Changes are visible to HTTP clients immediately and are persisted to `db.yml` exactly like REST writes. With inline `data` they stay in memory.
- `create()` uses the server's id strategy (`increment` by default).
- Returned items are copies: changing one does not change the stored data — use `update()`.
- `collection()` throws for a collection that does not exist, and when called before `start()`.

The same handle is available inside [handler functions](/routes/handlers/#reading-and-writing-collections) as `ctx.collection`. Generate `User` and the other item types with [`yrest types`](/integrations/codegen/).

## Vitest example

## Playwright example

## Cypress example

## Next steps

- [Configuration](/getting-started/configuration/) — same options available in `yrest.config.yml`
- [Quick Start](/getting-started/quick-start/) — run yRest from the CLI
- [CLI Reference](/reference/cli-reference/) — `yrest serve` flag reference
- [TypeScript Codegen](/integrations/codegen/) — generate the item types for `collection<T>()`
