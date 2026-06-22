---
title: Configuration
description: All yRest options — config file, CLI flags and priority rules
---

yRest options can be set in three places: schema defaults, a `yrest.config.yml` file, and CLI flags. The resolution order is **schema defaults → config file → CLI flags** — each source overrides the one to its left.

## The config file

`yrest.config.yml` lives in the same directory as your `db.yml`. The `init` command creates both files at once:

```bash
npx @yrest/cli init
```

A complete config file with all options looks like this:

```yaml
# yrest.config.yml
port: 3070
host: localhost
base: ""
watch: false
readonly: false
delay: 0
snapshot: false
pageable: false
idStrategy: increment
# handlers: ./yrest.handlers.js
```

You only need to include the options you want to override — any key you omit falls back to the schema default.

## Priority rules

| Source             | Priority | When it applies                               |
| ------------------ | -------- | --------------------------------------------- |
| Schema defaults    | Lowest   | Always — the built-in fallback                |
| `yrest.config.yml` | Middle   | When the file exists in the working directory |
| CLI flags          | Highest  | When explicitly passed to `yrest serve`       |

A flag passed on the command line always wins over the config file. The config file always wins over the built-in defaults.

## Options reference

### port

|          |                  |
| -------- | ---------------- |
| Type     | `number`         |
| Default  | `3070`           |
| CLI flag | `-p, --port <n>` |

The TCP port the server listens on. Port `3070` was chosen to avoid conflicts with the most common development ports (3000, 3001, 4000, 8080, 8000), so you can run yRest alongside your frontend dev server without changing any config.

```yaml
port: 4000
```

```bash
npx @yrest/cli serve db.yml --port 4000
```

---

### host

|          |                     |
| -------- | ------------------- |
| Type     | `string`            |
| Default  | `"localhost"`       |
| CLI flag | `-H, --host <host>` |

The hostname or IP address the server binds to. The default `localhost` makes the server reachable only from the same machine. Set to `0.0.0.0` to expose the server on all network interfaces — useful inside Docker containers or when other devices on the LAN need to reach it.

```yaml
host: 0.0.0.0 # expose on all interfaces
```

---

### base

|          |                     |
| -------- | ------------------- |
| Type     | `string`            |
| Default  | `""` (none)         |
| CLI flag | `-b, --base <path>` |

A URL prefix prepended to every route — both CRUD collection routes and custom `_routes` entries. A leading slash is added automatically if you omit it.

With `base: /api/v1`, the collection `users` is exposed at `/api/v1/users` instead of `/users`. The `/_about` and `/_snapshot` meta endpoints are not prefixed.

```yaml
base: /api/v1
```

```bash
# GET http://localhost:3070/api/v1/users
npx @yrest/cli serve db.yml --base /api/v1
```

---

### watch

|          |               |
| -------- | ------------- |
| Type     | `boolean`     |
| Default  | `false`       |
| CLI flag | `-w, --watch` |

When enabled, yRest watches `db.yml` for file system changes and reloads automatically without restarting the process. Any collection, relation, or custom route you add to the file appears immediately in the running server.

This is useful during active development when you are editing the data file frequently. In CI or production-like environments, leave it `false` so the data stays stable throughout a test run.

```yaml
watch: true
```

---

### readonly

|          |                  |
| -------- | ---------------- |
| Type     | `boolean`        |
| Default  | `false`          |
| CLI flag | `-r, --readonly` |

When enabled, all mutating requests — POST, PUT, PATCH and DELETE — are rejected with `405 Method Not Allowed`. GET requests and meta endpoints (`/_about`, `/_snapshot`) continue to work normally.

Use this when you want to share a stable mock that cannot be accidentally modified — for example, a shared staging environment, a demo, or a read-only API fixture in a test suite where writes are not expected.

```yaml
readonly: true
```

---

### delay

|          |                         |
| -------- | ----------------------- |
| Type     | `number` (milliseconds) |
| Default  | `0` (disabled)          |
| CLI flag | `-d, --delay <ms>`      |

Adds a fixed latency to every response before it is sent. This simulates a slow network or a high-latency backend, making it easier to test loading states, skeleton screens, and timeout handling in your frontend.

The delay applies to all routes — collection endpoints, custom routes, and SSE connections. For per-route latency on individual `_routes` entries, use the `delay:` key inside the route definition instead.

```yaml
delay: 300 # simulate a 300 ms round trip
```

---

### snapshot

|          |                  |
| -------- | ---------------- |
| Type     | `boolean`        |
| Default  | `false`          |
| CLI flag | `-s, --snapshot` |

When enabled, yRest saves the initial state of the database at startup and exposes three meta endpoints:

| Endpoint           | Method | Description                                             |
| ------------------ | ------ | ------------------------------------------------------- |
| `/_snapshot`       | `GET`  | Returns snapshot metadata (timestamp of last save)      |
| `/_snapshot/save`  | `POST` | Replaces the saved snapshot with the current live state |
| `/_snapshot/reset` | `POST` | Restores the database to the last saved snapshot        |

This is most useful in integration test suites: call `POST /_snapshot/reset` in a `beforeEach` hook to guarantee a clean, deterministic state before every test. Changes accumulated during one test never leak into the next.

```yaml
snapshot: true
```

```bash
# Reset the database to its initial state between test runs
curl -X POST http://localhost:3070/_snapshot/reset
```

---

### pageable

|          |                       |
| -------- | --------------------- |
| Type     | `boolean` or `number` |
| Default  | `false`               |
| CLI flag | `--pageable [limit]`  |

When enabled, GET collection responses are wrapped in a `{ data, pagination }` envelope instead of returning a plain array:

```json
{
  "data": [
    { "id": 1, "name": "Ana" },
    { "id": 2, "name": "Luis" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  }
}
```

Accepts three forms:

| Value    | Behaviour                                  |
| -------- | ------------------------------------------ |
| `false`  | Disabled — plain array responses (default) |
| `true`   | Enabled with a default page size of 10     |
| `number` | Enabled with a custom default page size    |

```yaml
pageable: true   # enabled, 10 items per page by default
pageable: 20     # enabled, 20 items per page by default
```

The per-request `?_page` and `?_limit` query parameters always override the configured default. If a client sends `?_page=2&_limit=5` the server uses those values regardless of what `pageable` is set to.

---

### idStrategy

|          |                            |
| -------- | -------------------------- |
| Type     | `"increment"` \| `"uuid"`  |
| Default  | `"increment"`              |
| CLI flag | `--id-strategy <strategy>` |

The strategy used to generate `id` values when a new item is created via POST without an explicit `id` in the request body.

| Strategy    | Behaviour                                                     |
| ----------- | ------------------------------------------------------------- |
| `increment` | Next integer above the current maximum `id` in the collection |
| `uuid`      | A random UUID v4 string from `crypto.randomUUID()`            |

Use `uuid` when your frontend code expects string IDs, when you need IDs that are stable across restarts, or when items from multiple collections need globally unique identifiers.

```yaml
idStrategy: uuid
```

---

### handlers

|          |                      |
| -------- | -------------------- |
| Type     | `string` (file path) |
| Default  | _(auto-discovered)_  |
| CLI flag | `--handlers <file>`  |

Path to a JavaScript file exporting handler functions for custom routes. yRest loads the file at startup and calls the exported function whose name matches the `handler:` key in a `_routes` entry.

```yaml
handlers: ./yrest.handlers.js
```

If this option is omitted, yRest still auto-discovers `yrest.handlers.js` (or `.mjs`) in the current working directory. Use the explicit path when your handlers file has a different name or lives in a subdirectory.

---

## Full example

A config file for a CI environment that simulates realistic latency and resets cleanly between test runs:

```yaml
# yrest.config.yml
port: 3070
host: 0.0.0.0 # expose on all interfaces (Docker / CI runner)
base: /api/v1
watch: false # stable data during the test run
readonly: false # tests need to write
delay: 120 # simulate realistic network latency
snapshot: true # enable POST /_snapshot/reset between test suites
pageable: 20 # default page size for list endpoints
idStrategy: uuid # string IDs expected by the frontend
handlers: ./tests/handlers.js
```

## Next steps

- [Server Modes](/reference/server-modes/) — deeper explanation of watch, readonly, delay, snapshot and pageable behaviour
- [CLI Reference](/reference/cli-reference/) — full flag syntax for every command
- [Handler Functions](/routes/handlers/) — the `handler:` key and the handlers file format
