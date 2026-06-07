# yrest

Zero-config REST API mock server powered by a YAML file.

Define your data in a `db.yml` file and get a fully functional CRUD REST API in seconds — no backend required.

## Install

```bash
npm install -D @aggiovato/yrest
```

Or run directly with npx:

```bash
npx @aggiovato/yrest serve db.yml
```

## Quick start

```bash
# Create a sample db.yml and yrest.config.yml in the current directory
npx @aggiovato/yrest init

# Start the server
npx @aggiovato/yrest serve db.yml
```

```txt
yrest running at http://localhost:3070

Resources (base: /):
  /users
  /posts
```

Open `http://localhost:3070/_about` in your browser for a live overview of all generated endpoints.

---

## Commands

### `init`

Creates a sample `db.yml` and a `yrest.config.yml` template in the current directory.

```bash
npx @aggiovato/yrest init                            # basic sample (default)
npx @aggiovato/yrest init --sample relational        # with _rel relations
npx @aggiovato/yrest init --file api.yml             # custom filename
npx @aggiovato/yrest init --sample relational --file api.yml
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
npx @aggiovato/yrest serve db.yml
npx @aggiovato/yrest serve db.yml --port 3001 --host 0.0.0.0
npx @aggiovato/yrest serve db.yml --base /api --watch
npx @aggiovato/yrest serve db.yml --readonly --delay 300
npx @aggiovato/yrest serve db.yml --pageable 20
```

| Flag             | Default     | Description                                                             |
| ---------------- | ----------- | ----------------------------------------------------------------------- |
| `--port`         | `3070`      | Port to listen on                                                       |
| `--host`         | `localhost` | Host to bind                                                            |
| `--base`         | _(none)_    | Prefix for all routes (e.g. `/api`)                                     |
| `--watch`        | `false`     | Reload `db.yml` automatically when it changes on disk                   |
| `--readonly`     | `false`     | Reject all write operations (POST, PUT, PATCH, DELETE) with `405`       |
| `--delay <ms>`   | `0`         | Add a fixed delay to all responses (simulates network latency)          |
| `--pageable [n]` | `false`     | Wrap GET collection responses in `{ data, pagination }`. Optional limit |

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

```txt
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

```txt
GET /users?name=Ana
GET /users?role=admin&active=true
```

Comparison is case-sensitive and converts types to string (`?id=1` matches numeric `id: 1`).

### Sorting

```txt
GET /users?_sort=name              # ascending (default)
GET /users?_sort=name&_order=desc  # descending
```

String fields are compared case-insensitively. Items missing the sort field are pushed to the end.

### Pagination

**Without `--pageable`** (default):

```txt
GET /users?_page=1&_limit=10   # page 1, 10 items per page
GET /users?_limit=5            # first 5 items
```

When `_page` or `_limit` are used, the response includes an `X-Total-Count` header with the total number of items before pagination.

**With `--pageable`** (or `pageable: true` in config):

Every GET collection response is automatically wrapped in a `{ data, pagination }` envelope:

```bash
npx @aggiovato/yrest serve db.yml --pageable      # default limit: 10
npx @aggiovato/yrest serve db.yml --pageable 20   # custom limit: 20
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

### Relation embedding (`?_expand`)

Embed a related parent object directly into the response using the `_rel` block (see [Relational data](#relational-data)):

```txt
GET /posts?_expand=user           # embed user object in each post
GET /posts/1?_expand=user         # embed in a single item
```

Both syntaxes are supported:

```txt
?_expand=author,category          # comma-separated
?_expand=author&_expand=category  # repeated param
```

Unresolvable keys are silently ignored. Works on all operations: GET, POST, PUT, PATCH, DELETE.

### Combined example

```txt
GET /posts?userId=1&_sort=title&_order=asc&_page=1&_limit=5&_expand=user
```

Returns the first 5 posts by user 1, sorted alphabetically by title, with the user object embedded.

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

```txt
GET /users/1/posts    # all posts where userId === 1
```

**Relation embedding with `?_expand`:**

```txt
GET /posts/1?_expand=user   →  { id: 1, title: "First post", userId: 1, user: { id: 1, name: "Ana" } }
```

---

## Server modes

### Watch mode

Automatically reloads `db.yml` when it changes on disk — useful when you edit the file manually while the server is running:

```bash
npx @aggiovato/yrest serve db.yml --watch
```

> **Note:** Watch mode reloads data in existing collections. Adding or removing entire collections requires a server restart.

### Readonly mode

Rejects all write operations with `405 Method Not Allowed`:

```bash
npx @aggiovato/yrest serve db.yml --readonly
```

Useful to expose a stable read-only snapshot for demos or CI environments.

### Delay mode

Adds a fixed delay (in milliseconds) to every response to simulate real network latency:

```bash
npx @aggiovato/yrest serve db.yml --delay 500   # 500ms on every response
```

---

## API overview page

Every running server exposes `GET /_about` — a self-contained HTML page listing all generated endpoints, active modes, query param reference and ready-to-run `curl` examples derived from your actual `db.yml`:

```bash
open http://localhost:3070/_about
```

The page reflects the live state of the server, so it updates automatically in watch mode.

---

## HTTP responses

| Status | When                                   |
| ------ | -------------------------------------- |
| `200`  | Successful GET, PUT, PATCH, DELETE     |
| `201`  | Successful POST                        |
| `404`  | Resource or id not found               |
| `405`  | Write operation in readonly mode       |
| `500`  | Error reading or writing the YAML file |

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

// Filter + sort + paginate
const res = await fetch("http://localhost:3070/users?role=admin&_sort=name&_page=1&_limit=10");

// Embed related object
const post = await fetch("http://localhost:3070/posts/1?_expand=user").then((r) => r.json());
// → { id: 1, title: "...", userId: 1, user: { id: 1, name: "Ana" } }

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
```

## Use in package.json scripts

```json
{
  "scripts": {
    "mock": "yrest serve db.yml",
    "mock:watch": "yrest serve db.yml --watch"
  }
}
```

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

## License

MIT
