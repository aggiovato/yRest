# yRest

[![npm version](https://img.shields.io/npm/v/@yrest/cli)](https://www.npmjs.com/package/@yrest/cli)
[![npm downloads](https://img.shields.io/npm/dw/@yrest/cli)](https://www.npmjs.com/package/@yrest/cli)
[![license](https://img.shields.io/npm/l/@yrest/cli)](LICENSE)
[![CI](https://github.com/aggiovato/yRest/actions/workflows/ci.yml/badge.svg)](https://github.com/aggiovato/yRest/actions)
[![Node](https://img.shields.io/node/v/@yrest/cli)](https://www.npmjs.com/package/@yrest/cli)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)](https://www.typescriptlang.org/)

YAML-powered json-server alternative. Zero-config REST API mock server with full CRUD, relations, filters and snapshots from a `db.yml` file.

> Think `json-server`, but powered by YAML — with relations, filters, pagination, nested routes, snapshots and custom handlers.

```yaml
# db.yml
users:
  - id: 1
    name: Ana
    email: ana@test.com

posts:
  - id: 1
    title: First post
    userId: 1
```

```bash
npx @yrest/cli serve db.yml
```

```
GET  /users          → [{ id: 1, name: "Ana", email: "ana@test.com" }]
GET  /users/1        → { id: 1, name: "Ana", email: "ana@test.com" }
POST /users          → 201 Created
PUT  /users/1        → 200 OK
PATCH /users/1       → 200 OK
DELETE /users/1      → 200 OK
```

---

## Why yRest?

A YAML-first alternative to json-server for frontend development.

| Feature                                      | yrest | json-server |
| -------------------------------------------- | :---: | :---------: |
| YAML database                                |  ✅   |     ❌      |
| Zero config                                  |  ✅   |     ✅      |
| Full CRUD                                    |  ✅   |     ✅      |
| Field operators (`_gte`, `_like`, `_regex`…) |  ✅   |     ⚠️      |
| Full-text search                             |  ✅   |     ✅      |
| Relations + nested routes                    |  ✅   |     ✅      |
| Field projection (`_fields`)                 |  ✅   |     ❌      |
| Pageable mode (envelope response)            |  ✅   |     ❌      |
| Custom static routes (`_routes`)             |  ✅   |     ❌      |
| Template variables in responses              |  ✅   |     ❌      |
| Handler functions (JS logic)                 |  ✅   |     ❌      |
| Conditional scenarios (`scenarios:`)         |  ✅   |     ❌      |
| Snapshot endpoints                           |  ✅   |     ❌      |
| Config file                                  |  ✅   |     ⚠️      |
| API overview page (`/_about`)                |  ✅   |     ❌      |
| Watch mode                                   |  ✅   |     ✅      |
| Readonly mode                                |  ✅   |     ❌      |
| Atomic writes                                |  ✅   |     ✅      |
| TypeScript types                             |  ✅   |     ❌      |
| Programmatic API for test frameworks         |  ✅   |     ❌      |

---

## Install

```bash
npm install -D @yrest/cli
```

Or run directly with npx (no install needed):

```bash
npx @yrest/cli serve db.yml
```

---

## Quick start

```bash
# Create a sample db.yml and yrest.config.yml
npx @yrest/cli init

# Start the server
npx @yrest/cli serve db.yml
```

```
yrest  ·  http://localhost:3070

Collections (base: /):
  CRUD  /users
  CRUD  /posts

Meta:
  GET    /_about
```

Open `http://localhost:3070/_about` for a live overview of all generated endpoints, active modes and ready-to-run `curl` examples.

---

## Commands

### `init`

Creates a sample `db.yml` and a `yrest.config.yml` template in the current directory.

```bash
npx @yrest/cli init                            # basic sample (default)
npx @yrest/cli init --sample relational        # with _rel relations
npx @yrest/cli init --file api.yml             # custom filename
npx @yrest/cli init --sample relational --file api.yml
```

| Flag       | Default  | Description                         |
| ---------- | -------- | ----------------------------------- |
| `--file`   | `db.yml` | Output filename                     |
| `--sample` | `basic`  | Sample data (`basic`, `relational`) |

**Samples:**

- `basic` — two independent collections: `users` and `products`
- `relational` — three collections with `_rel` relationships: `users`, `posts` and `comments`

---

### `serve`

Starts the mock server.

```bash
npx @yrest/cli serve db.yml
npx @yrest/cli serve db.yml --port 3001 --host 0.0.0.0
npx @yrest/cli serve db.yml --base /api --watch
npx @yrest/cli serve db.yml --readonly --delay 300
npx @yrest/cli serve db.yml --pageable 20
npx @yrest/cli serve db.yml --snapshot
npx @yrest/cli serve db.yml --handlers yrest.handlers.js
```

| Flag                | Default     | Description                                                             |
| ------------------- | ----------- | ----------------------------------------------------------------------- |
| `--port`            | `3070`      | Port to listen on                                                       |
| `--host`            | `localhost` | Host to bind                                                            |
| `--base`            | _(none)_    | Prefix for all routes (e.g. `/api`)                                     |
| `--watch`           | `false`     | Reload `db.yml` automatically when it changes on disk                   |
| `--readonly`        | `false`     | Reject all write operations (POST, PUT, PATCH, DELETE) with `405`       |
| `--delay <ms>`      | `0`         | Add a fixed delay to all responses (simulates network latency)          |
| `--pageable [n]`    | `false`     | Wrap GET collection responses in `{ data, pagination }`. Optional limit |
| `--snapshot`        | `false`     | Save initial state snapshot and expose `/_snapshot` endpoints           |
| `--handlers <file>` | _(none)_    | Path to a JS file exporting handler functions for custom routes         |

All flags can also be set in `yrest.config.yml` (see below). CLI flags always take priority over the config file.

---

## Configuration file

`yrest init` creates a `yrest.config.yml` alongside `db.yml`. Options defined here apply every time you run `serve` without needing to type flags:

```yaml
# yrest.config.yml
file: db.yml
port: 3070
host: localhost
# base: /api
# watch: false
# readonly: false
# delay: 0
# pageable: false   # true (limit 10), or a number (custom limit)
# snapshot: false
# handlers: yrest.handlers.js
```

**Priority order** (highest wins): CLI flags → `yrest.config.yml` → schema defaults.

---

## Database format

```yaml
users:
  - id: 1
    name: Ana
    email: ana@test.com
  - id: 2
    name: Luis
    email: luis@test.com

posts:
  - id: 1
    title: First post
    userId: 1
```

Each top-level key becomes a resource with full CRUD endpoints.

---

## Generated endpoints

For each resource in `db.yml`:

```
GET     /users          List all
GET     /users/:id      Get one
POST    /users          Create
PUT     /users/:id      Replace
PATCH   /users/:id      Partial update
DELETE  /users/:id      Delete
```

With `--base /api` all routes are prefixed: `/api/users`, `/api/users/:id`, etc.

---

## Query params

All query params can be combined freely.

### Filtering

Return only items that match one or more field values:

```
GET /users?name=Ana
GET /users?role=admin&active=true
```

Comparison is case-sensitive and converts types to string (`?id=1` matches numeric `id: 1`).

Repeated params are treated as OR — any match passes:

```
GET /users?role=admin&role=editor    # returns admins and editors
```

### Field operators

Append an operator suffix to any field name:

```
GET /users?age_gte=18               # age >= 18
GET /users?age_lte=65               # age <= 65
GET /users?status_ne=inactive       # status != "inactive"
GET /users?name_like=ana            # name contains "ana" (case-insensitive)
GET /users?name_start=A             # name starts with "A" (case-insensitive)
GET /users?email_regex=@gmail\.com  # email matches regex (case-insensitive)
```

| Suffix   | Type             | Description                      |
| -------- | ---------------- | -------------------------------- |
| `_gte`   | numeric / string | Greater than or equal            |
| `_lte`   | numeric / string | Less than or equal               |
| `_ne`    | any              | Not equal                        |
| `_like`  | string           | Case-insensitive substring match |
| `_start` | string           | Case-insensitive prefix match    |
| `_regex` | string           | Case-insensitive regex match     |

### Full-text search

Search across all scalar fields of every item (case-insensitive substring match):

```
GET /users?_q=ana
GET /posts?_q=javascript
```

An item passes if any string or number field contains the search term.

### Sorting

```
GET /users?_sort=name              # ascending (default)
GET /users?_sort=name&_order=desc  # descending
```

String fields are compared case-insensitively. Items missing the sort field are pushed to the end.

### Pagination

**Without `--pageable`** (default):

```
GET /users?_page=1&_limit=10   # page 1, 10 items per page
GET /users?_limit=5            # first 5 items
```

When `_page` or `_limit` are used, the response includes an `X-Total-Count` header with the total number of items before pagination.

**With `--pageable`** (or `pageable: true` in config):

Every GET collection response is automatically wrapped in a `{ data, pagination }` envelope:

```bash
npx @yrest/cli serve db.yml --pageable      # default limit: 10
npx @yrest/cli serve db.yml --pageable 20   # custom limit: 20
```

```json
{
  "data": [
    { "id": 1, "name": "Ana" },
    { "id": 2, "name": "Luis" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 23,
    "totalPages": 3,
    "isFirst": true,
    "isLast": false,
    "hasNext": true,
    "hasPrev": false
  }
}
```

The `?_page` and `?_limit` query params still work in pageable mode to navigate pages.

### Field projection

Return only specific fields in the response:

```
GET /users?_fields=id,name
GET /posts?_fields=id,title,userId
```

Works on both collection and single-item endpoints.

### Relation embedding (`_expand`)

Embed a related parent object directly into the response using the `_rel` block (see [Relational data](#relational-data)):

```
GET /posts?_expand=user           # embed user object in each post
GET /posts/1?_expand=user         # embed in a single item
```

Both syntaxes are supported:

```
?_expand=author,category          # comma-separated
?_expand=author&_expand=category  # repeated param
```

Unresolvable keys are silently ignored. Works on all operations: GET, POST, PUT, PATCH, DELETE.

### Embed children (`_embed`)

Embed related child collections directly into a parent item:

```
GET /users/1?_embed=posts         # embed all posts where userId === 1
GET /users?_embed=posts           # embed posts in every user
```

Both syntaxes are supported:

```
?_embed=posts,comments            # comma-separated
?_embed=posts&_embed=comments     # repeated param
```

Requires `_rel` to be declared (see [Relational data](#relational-data)).

### Combined example

```
GET /posts?userId=1&_sort=title&_order=asc&_page=1&_limit=5&_expand=user&_fields=id,title,user
```

Returns the first 5 posts by user 1, sorted alphabetically by title, with the user object embedded, returning only `id`, `title` and `user` fields.

---

## Relational data

Use `_rel` to declare foreign key relationships between collections:

```yaml
_rel:
  posts:
    userId: users

users:
  - id: 1
    name: Ana

posts:
  - id: 1
    title: First post
    userId: 1
```

This enables:

**Nested routes:**

```
GET /users/1/posts    # all posts where userId === 1
```

**Embed parent with `?_expand`:**

```
GET /posts/1?_expand=user   →  { id: 1, title: "First post", userId: 1, user: { id: 1, name: "Ana" } }
```

**Embed children with `?_embed`:**

```
GET /users/1?_embed=posts   →  { id: 1, name: "Ana", posts: [{ id: 1, title: "First post", userId: 1 }] }
```

---

## Custom routes

Define endpoints that don't fit CRUD directly in `db.yml` using the `_routes` block.

### Static responses

```yaml
_routes:
  - method: POST
    path: /login
    response:
      status: 200
      body:
        token: fake-jwt-token-abc123

  - method: POST
    path: /logout
    response:
      status: 204

  - method: GET
    path: /dashboard/stats
    response:
      status: 200
      headers:
        Cache-Control: no-store
      body:
        users: 150
        revenue: 4820.50
```

- `method` is case-insensitive. `path` supports Fastify params (`:id`).
- `response.status` defaults to `200`. `response.body` is any YAML value.
- Custom routes are registered before resource routes and always take priority.
- Shown in `/_about` under "Custom routes".

### Template variables

Interpolate request data into the response body using `{{}}` syntax:

```yaml
_routes:
  - method: GET
    path: /users/:id/summary
    response:
      status: 200
      body:
        requestedId: "{{params.id}}"
        timestamp: "{{now}}"

  - method: POST
    path: /echo
    response:
      status: 200
      body:
        received: "{{body}}"
        query: "{{query}}"
        requestId: "{{uuid}}"
```

Available variables:

| Variable        | Description                                         |
| --------------- | --------------------------------------------------- |
| `{{params.X}}`  | URL parameter (e.g. `{{params.id}}`)                |
| `{{query.X}}`   | Query string param (e.g. `{{query.page}}`)          |
| `{{body}}`      | Full request body                                   |
| `{{body.X}}`    | Field from the request body (e.g. `{{body.email}}`) |
| `{{headers.X}}` | Request header value                                |
| `{{now}}`       | Current UTC timestamp (ISO 8601)                    |
| `{{uuid}}`      | Random UUID v4                                      |

When a field contains only a single `{{variable}}` placeholder, the resolved value preserves its original type (number, boolean, object). When embedded in a larger string it is stringified.

### Conditional scenarios

Define multiple conditional response variants for a custom route. Scenarios are evaluated in declaration order — the first matching `when:` wins. If none match, the `otherwise:` block is used (if defined), otherwise the static `response:` block.

```yaml
_routes:
  - method: POST
    path: /login
    scenarios:
      - when:
          body.email: ana@test.com
          body.password: secret
        response:
          status: 200
          body:
            token: tok-ana
      - when:
          body.email: admin@test.com
          body.password: admin
        response:
          status: 200
          body:
            token: tok-admin
            role: admin
    otherwise:
      status: 401
      body:
        error: Invalid credentials
```

**`when:` as an object** — all entries must match (AND semantics):

```yaml
when:
  body.email: ana@test.com
  body.password: secret
```

**`when:` as an array of objects** — any group satisfying all its conditions matches (OR of ANDs):

```yaml
when:
  - body.role: admin
  - body.role: superadmin
```

Condition keys use dot-notation to address request data:

| Prefix      | Example             | Resolves to                |
| ----------- | ------------------- | -------------------------- |
| `body.X`    | `body.email`        | `req.body.email`           |
| `params.X`  | `params.id`         | `req.params.id`            |
| `query.X`   | `query.page`        | `req.query.page`           |
| `headers.X` | `headers.x-api-key` | `req.headers["x-api-key"]` |

Field operator suffixes (`_ne`, `_like`, `_start`, `_regex`, `_gte`, `_lte`) work on condition keys exactly as they do on query params:

```yaml
scenarios:
  - when:
      body.name_like: ana # name contains "ana" (case-insensitive)
      body.age_gte: "18" # age >= 18
    response:
      status: 200
      body: { ok: true }
```

Template variables (`{{}}`) are supported in both scenario and `otherwise` response bodies:

```yaml
scenarios:
  - when:
      body.email: ana@test.com
    response:
      status: 200
      body:
        message: "Welcome {{body.email}}"
otherwise:
  status: 401
  body:
    error: "Unknown user: {{body.email}}"
```

### Per-route delay

Add a fixed delay (ms) to a specific route without affecting the rest of the server. Takes priority over the global `--delay` option for that route:

```yaml
_routes:
  - method: GET
    path: /slow-endpoint
    delay: 800
    response:
      status: 200
      body: { data: loaded }
```

### Handler functions

For routes that need real logic (conditional responses, stateful mocks, request inspection), reference a JavaScript function via the `handler:` field:

```yaml
_routes:
  - method: POST
    path: /login
    handler: login
    response: # optional fallback if handler throws
      status: 200
      body: { token: fake }

  - method: GET
    path: /auth/me
    handler: getCurrentUser
```

Create a `yrest.handlers.js` file in the same directory as `db.yml`:

```js
// yrest.handlers.js
export async function login(req) {
  const { email, password } = req.body ?? {};
  if (password !== "secret") return { status: 401, body: { error: "Invalid credentials" } };
  return { status: 200, body: { token: `tok-${email}` } };
}

export async function getCurrentUser(req) {
  return { status: 200, body: { id: 1, name: "Ana", role: "admin" } };
}
```

Pass the file to the server with `--handlers`:

```bash
npx @yrest/cli serve db.yml --handlers yrest.handlers.js
```

**Handler signature:**

```ts
type HandlerRequest = {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: unknown;
  headers: Record<string, string | string[]>;
};

type HandlerResponse = {
  status?: number; // defaults to 200
  body?: unknown;
  headers?: Record<string, string>;
};

type Handler = (req: HandlerRequest) => HandlerResponse | Promise<HandlerResponse>;
```

If a named handler is not found in the file, the server returns `501`. If the handler throws, it returns `500`. If a `response:` block is defined alongside `handler:`, it is used as fallback only when the handler itself throws.

---

## Server modes

### Watch mode

Automatically reloads `db.yml` when it changes on disk — useful when you edit the file manually while the server is running:

```bash
npx @yrest/cli serve db.yml --watch
```

> **Note:** Watch mode reloads data in existing collections. Adding or removing entire collections requires a server restart.

### Readonly mode

Rejects all write operations with `405 Method Not Allowed`:

```bash
npx @yrest/cli serve db.yml --readonly
```

Useful to expose a stable read-only snapshot for demos or CI environments.

### Delay mode

Adds a fixed delay (in milliseconds) to every response to simulate real network latency:

```bash
npx @yrest/cli serve db.yml --delay 500   # 500ms on every response
```

### Snapshot mode

Saves the initial database state at startup and exposes three meta endpoints to inspect, save and restore it:

```bash
npx @yrest/cli serve db.yml --snapshot
```

| Endpoint                | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `GET /_snapshot`        | Returns snapshot metadata (saved time + item counts per collection) |
| `POST /_snapshot/save`  | Replaces the snapshot with the current database state               |
| `POST /_snapshot/reset` | Restores the database to the last saved snapshot                    |

Useful for test suites that need a clean reset between runs or demos that need a predictable starting state.

---

## API overview page

Every running server exposes `GET /_about` — a self-contained HTML page listing all generated endpoints, custom routes, active modes, query param reference and ready-to-run `curl` examples derived from your actual `db.yml`:

```bash
open http://localhost:3070/_about
```

The page reflects the live state of the server, so it updates automatically in watch mode.

---

## HTTP responses

| Status | When                                                                 |
| ------ | -------------------------------------------------------------------- |
| `200`  | Successful GET, PUT, PATCH, DELETE                                   |
| `201`  | Successful POST                                                      |
| `400`  | Invalid or missing request body                                      |
| `404`  | Resource or id not found                                             |
| `405`  | Write operation in readonly mode                                     |
| `500`  | Error reading or writing the YAML file                               |
| `501`  | Handler referenced in `_routes` is not exported by the handlers file |

DELETE returns the deleted item as confirmation.

---

## ID generation

If a POST body does not include an `id`, yrest assigns the next incremental integer automatically. If the body includes an `id`, it is respected.

## Persistence

All write operations (POST, PUT, PATCH, DELETE) are saved back to `db.yml` immediately using an atomic write strategy (write to temp file → rename), so data is never corrupted even if the process is interrupted.

## CORS

CORS is enabled by default, so you can call the API from any frontend running on a different port without extra configuration.

---

## Frontend usage

```ts
// List all
const users = await fetch("http://localhost:3070/users").then((r) => r.json());

// Filter + operators + search
const res = await fetch("http://localhost:3070/users?age_gte=18&name_like=ana&_q=dev");

// Sort + paginate + project fields
const res = await fetch("http://localhost:3070/users?_sort=name&_page=1&_limit=10&_fields=id,name");

// Embed related object (parent)
const post = await fetch("http://localhost:3070/posts/1?_expand=user").then((r) => r.json());
// → { id: 1, title: "...", userId: 1, user: { id: 1, name: "Ana" } }

// Embed children
const user = await fetch("http://localhost:3070/users/1?_embed=posts").then((r) => r.json());
// → { id: 1, name: "Ana", posts: [{ id: 1, title: "First post", userId: 1 }] }

// Create
await fetch("http://localhost:3070/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Carlos", email: "carlos@test.com" }),
});

// Partial update
await fetch("http://localhost:3070/users/1", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Ana Updated" }),
});

// Delete
await fetch("http://localhost:3070/users/1", { method: "DELETE" });

// Custom route with handler
const session = await fetch("http://localhost:3070/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "ana@test.com", password: "secret" }),
}).then((r) => r.json());
// → { token: "tok-ana@test.com" }
```

## Programmatic API

Use yRest directly inside your test suite — no CLI, no separate process to manage.

Install as a dev dependency:

```bash
npm install -D @yrest/cli
```

### `createYrestServer`

Creates a server instance that you control with `start()` and `stop()`. Accepts either inline YAML data or a path to a `db.yml` file.

```ts
import { createYrestServer, yrest } from "@yrest/cli";
```

**Options:**

| Option     | Type              | Default     | Description                                            |
| ---------- | ----------------- | ----------- | ------------------------------------------------------ |
| `data`     | `Data`            | —           | Inline data object (use with `yrest\`...\``)           |
| `file`     | `string`          | —           | Path to a `db.yml` file (`data` or `file` is required) |
| `port`     | `number`          | `3070`      | TCP port. Use `0` to get a random available port       |
| `host`     | `string`          | `localhost` | Host to bind                                           |
| `base`     | `string`          | —           | URL prefix for all routes (e.g. `"/api"`)              |
| `readonly` | `boolean`         | `false`     | Reject all write operations with `405`                 |
| `delay`    | `number`          | `0`         | Fixed delay in ms added to every response              |
| `pageable` | `boolean\|number` | `false`     | Wrap GET responses in `{ data, pagination }` envelope  |
| `snapshot` | `boolean`         | `false`     | Enable snapshot endpoints (`/_snapshot`)               |
| `handlers` | `string`          | —           | Path to a JS file exporting handler functions          |

**Returned handle:**

| Member    | Description                                              |
| --------- | -------------------------------------------------------- |
| `start()` | Starts the server and begins listening                   |
| `stop()`  | Gracefully closes the server                             |
| `port`    | The actual port after `start()` (useful when `port: 0`)  |
| `url`     | Base URL after `start()` (e.g. `http://localhost:49821`) |

### `yrest` tagged template literal

Parses inline YAML into a data object. Strips common leading indentation automatically, so you can indent naturally inside your test files. Supports interpolated values.

```ts
const data = yrest`
  users:
    - id: 1
      name: Ana
  posts:
    - id: 1
      title: First post
      userId: 1
`;
```

### Vitest example

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createYrestServer, yrest } from "@yrest/cli";

const server = createYrestServer({
  data: yrest`
    users:
      - id: 1
        name: Ana
      - id: 2
        name: Luis
  `,
  port: 0, // random port — no conflicts between parallel tests
  readonly: true,
});

beforeAll(() => server.start());
afterAll(() => server.stop());

describe("users API", () => {
  it("returns all users", async () => {
    const res = await fetch(`${server.url}/users`);
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(2);
  });

  it("returns a single user", async () => {
    const res = await fetch(`${server.url}/users/1`);
    expect(await res.json()).toMatchObject({ name: "Ana" });
  });
});
```

### Playwright example

```ts
// tests/api.spec.ts
import { test, expect, beforeAll, afterAll } from "@playwright/test";
import { createYrestServer, yrest } from "@yrest/cli";

const server = createYrestServer({
  data: yrest`
    users:
      - id: 1
        name: Ana
  `,
  port: 0,
  readonly: true,
});

beforeAll(() => server.start());
afterAll(() => server.stop());

test("lists users", async () => {
  const res = await fetch(`${server.url}/users`);
  expect(await res.json()).toHaveLength(1);
});
```

### File-based example

When your test data is too large for inline YAML, point to a file:

```ts
const server = createYrestServer({
  file: "./tests/fixtures/db.yml",
  port: 0,
  readonly: true,
});
```

---

## Use in package.json scripts

```json
{
  "scripts": {
    "mock": "yrest serve db.yml",
    "mock:watch": "yrest serve db.yml --watch",
    "mock:readonly": "yrest serve db.yml --readonly --delay 200"
  }
}
```

---

## Roadmap

| Feature                                            | Status |
| -------------------------------------------------- | ------ |
| Full CRUD from `db.yml`                            | ✅     |
| Field filters, operators, full-text search         | ✅     |
| Relations, `_expand`, `_embed`, nested routes      | ✅     |
| Pagination, sorting, field projection              | ✅     |
| Watch, readonly, delay, snapshot modes             | ✅     |
| Custom routes (`_routes`) with static responses    | ✅     |
| Template variables in responses (`{{params.id}}`)  | ✅     |
| Handler functions (`yrest.handlers.js`)            | ✅     |
| Visual panel (`/_panel`)                           | 🔜     |
| Programmatic API for Vitest / Playwright           | ✅     |
| Docker image                                       | 🔜     |
| OpenAPI export (`yrest openapi db.yml`)            | 🔜     |
| VS Code extension with YAML snippets               | 🔜     |
| Request validation with JSON Schema                | 🔜     |
| Conditional scenarios (`scenarios:`, `otherwise:`) | ✅     |
| Per-route delay (`delay:`)                         | ✅     |

---

## Contributing

### Prerequisites

- Node.js >= 20
- [Task](https://taskfile.dev) — task runner (`brew install go-task` / `scoop install task` / [other methods](https://taskfile.dev/installation/))

### Task commands

Run `task --list` to see all available commands.

#### Development

| Command                 | What it does                                                           |
| ----------------------- | ---------------------------------------------------------------------- |
| `task test`             | Runs the full test suite once                                          |
| `task test:watch`       | Runs tests in watch mode — reruns on every file change                 |
| `task build`            | Compiles TypeScript to `dist/` via tsup                                |
| `task dev`              | Builds once, then starts watch-build + server from `dist/` in parallel |
| `task serve:dist`       | Builds and starts the server from the local `dist/`                    |
| `task serve:dist:watch` | Builds and starts the server with `--watch` (reloads db.yml on change) |
| `task serve:npx`        | Starts the published npm version (useful to compare against local)     |
| `task serve:npx:watch`  | Starts the published npm version with `--watch`                        |
| `task preflight`        | Full pre-push check: format, lint, typecheck and tests in order        |

#### Release

| Command              | What it does                                                   |
| -------------------- | -------------------------------------------------------------- |
| `task release:patch` | Bumps `x.x.N`, creates a git commit and tag                    |
| `task release:minor` | Bumps `x.N.0`, creates a git commit and tag                    |
| `task release:major` | Bumps `N.0.0`, creates a git commit and tag                    |
| `task publish`       | Runs tests + build and publishes to npm (requires `npm login`) |

### Development workflow

**Day-to-day work:**

```bash
task test:watch   # keep this running in one terminal
task dev          # keep this running in another terminal
```

`test:watch` reruns the suite on every save so you catch regressions immediately. `dev` rebuilds and serves so you can call the endpoints manually while you work.

**Before pushing:**

```bash
task preflight    # format + lint + typecheck + tests in one command
```

**Good practices:**

- Write tests for every new feature or bug fix before opening a PR.
- Keep `db.yml` in a valid state — it is used as the default file when running local servers.
- `dist/` is gitignored and generated at build time; never commit it manually.
- Version bumps are done with `task release:*`, not by editing `package.json` directly — the Task command also creates the git tag that triggers the publish pipeline.

### Release workflow

Releases are fully automated via GitHub Actions once a version tag is pushed:

```bash
# 1. Make sure everything is clean
task preflight

# 2. Bump the version (choose one)
task release:patch   # bug fixes
task release:minor   # new features, backwards compatible
task release:major   # breaking changes

# 3. Push the commit and the tag
git push && git push --tags
```

Step 3 triggers two GitHub Actions pipelines automatically:

- **CI** — runs on every push to `main` and on every PR. Executes typecheck + tests on Node 20 and Node 22.
- **Publish** — runs only when a `v*` tag is pushed. Runs tests + build and publishes to npm using Trusted Publishing (OIDC — no tokens stored as secrets).

### CI/CD pipelines

```
push to main / PR open
        │
        ▼
    [CI workflow]
    ├── Node 20: lint + format check + typecheck + tests
    └── Node 22: lint + format check + typecheck + tests

push tag v*
        │
        ▼
    [Publish workflow]
    ├── tests + build  (via prepublishOnly)
    └── npm publish --provenance  (via Trusted Publishing / OIDC, Node 24)
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## License

MIT
