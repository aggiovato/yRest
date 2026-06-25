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

`server.collection<T>(name)` returns a typed CRUD handle for the named collection:

```ts
import type { User } from "./db.types"; // from yrest types codegen

const users = server.collection<User>("users");
users.findAll(); // User[]
users.findById(1); // User | undefined
users.create({ name: "Ana" }); // User
users.update(1, { name: "Ana M." });
users.delete(1);
```

## Vitest example

## Playwright example

## Cypress example

## Next steps

- [Configuration](/getting-started/configuration/) — same options available in `yrest.config.yml`
- [Quick Start](/getting-started/quick-start/) — run yRest from the CLI
- [CLI Reference](/reference/cli-reference/) — `yrest serve` flag reference
