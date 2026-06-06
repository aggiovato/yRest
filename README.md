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
# Create a sample db.yml in the current directory
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

## Commands

### `init`

Creates a sample `db.yml` in the current directory.

```bash
npx @aggiovato/yrest init                            # basic sample (default)
npx @aggiovato/yrest init --sample relational        # with _rel relations
npx @aggiovato/yrest init --file api.yml             # custom filename
npx @aggiovato/yrest init --sample relational --file api.yml
```

| Flag | Default | Description |
|------|---------|-------------|
| `--file` | `db.yml` | Output filename |
| `--sample` | `basic` | Sample data (`basic`, `relational`) |

**Samples:**
- `basic` — two independent collections: `users` and `products`
- `relational` — three collections with `_rel` relationships: `users`, `posts` and `comments`

### `serve`

Starts the mock server.

```bash
npx @aggiovato/yrest serve db.yml
npx @aggiovato/yrest serve db.yml --port 3001
npx @aggiovato/yrest serve db.yml --host 0.0.0.0
npx @aggiovato/yrest serve db.yml --base /api
```

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `3070` | Port to listen on |
| `--host` | `localhost` | Host to bind |
| `--base` | _(none)_ | Prefix for all routes |

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

## Query params

All query params can be combined freely.

### Filtering

Return only items that match a field value:

```txt
GET /users?name=Ana
GET /users?role=admin&active=true
```

Comparison is case-sensitive and converts types to string (`?id=1` matches numeric `id: 1`).

### Sorting

```txt
GET /users?_sort=name              # ascending (default)
GET /users?_sort=name&_order=desc  # descending
GET /users?_sort=id&_order=asc
```

String fields are compared case-insensitively. Items missing the sort field are pushed to the end.

### Pagination

```txt
GET /users?_page=1&_limit=10   # page 1, 10 items per page
GET /users?_limit=5            # first 5 items
GET /users?_page=2&_limit=5    # items 6–10
```

When pagination is active, the response includes an `X-Total-Count` header with the total number of items before pagination (after any active filter).

### Combined example

```txt
GET /users?role=admin&_sort=name&_order=asc&_page=1&_limit=5
```

Returns the first 5 admin users sorted alphabetically by name.

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

This enables nested routes:

```txt
GET /users/1/posts    # all posts where userId === 1
```

## HTTP responses

| Status | When |
|--------|------|
| `200` | Successful GET, PUT, PATCH, DELETE |
| `201` | Successful POST |
| `404` | Resource or id not found |
| `500` | Error reading or writing the YAML file |

DELETE returns the deleted item (useful for debugging).

## ID generation

If a POST body does not include an `id`, yrest assigns the next incremental integer automatically. If the body includes an `id`, it is respected.

## Persistence

All write operations (POST, PUT, PATCH, DELETE) are saved back to `db.yml` immediately using an atomic write strategy (write to temp file → rename), so data is never corrupted even if the process is interrupted.

## CORS

CORS is enabled by default, so you can call the API from any frontend running on a different port without extra configuration.

## Frontend usage

```ts
// List
const users = await fetch("http://localhost:3070/users").then(r => r.json());

// Filter + sort + paginate
const res = await fetch("http://localhost:3070/users?role=admin&_sort=name&_page=1&_limit=10");

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
    "mock": "yrest serve db.yml"
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

| Command | What it does |
|---------|-------------|
| `task test` | Runs the full test suite once |
| `task test:watch` | Runs tests in watch mode — reruns on every file change |
| `task build` | Compiles TypeScript to `dist/` via tsup |
| `task dev` | Builds once, then starts watch-build + server from `dist/` in parallel |
| `task serve:dist` | Builds and starts the server from the local `dist/` |
| `task serve:npx` | Starts the version currently published on npm (useful to compare against local) |

#### Release

| Command | What it does |
|---------|-------------|
| `task release:patch` | Bumps `x.x.N`, creates a git commit and tag |
| `task release:minor` | Bumps `x.N.0`, creates a git commit and tag |
| `task release:major` | Bumps `N.0.0`, creates a git commit and tag |
| `task publish` | Runs tests + build and publishes to npm (requires `npm login`) |

### Development workflow

**Day-to-day work:**

```bash
task test:watch   # keep this running in one terminal
task dev          # keep this running in another terminal
```

`test:watch` reruns the suite on every save so you catch regressions immediately. `dev` rebuilds and serves so you can call the endpoints manually while you work.

**Before committing:**

```bash
task test         # confirm everything passes
```

The test suite covers all routes, filters, sorting, pagination and CRUD operations. Do not commit with failing tests.

**Good practices:**

- Write tests for every new feature or bug fix before opening a PR.
- Keep `db.yml` in a valid state — it is used as the default file when running local servers.
- `dist/` is gitignored and generated at build time; never commit it manually.
- Version bumps are done with `task release:*`, not by editing `package.json` directly — the Task command also creates the git tag that triggers the publish pipeline.

### Release workflow

Releases are fully automated via GitHub Actions once a version tag is pushed:

```bash
# 1. Make sure all tests pass
task test

# 2. Bump the version (choose one)
task release:patch   # bug fixes
task release:minor   # new features, backwards compatible
task release:major   # breaking changes

# 3. Push the commit and the tag
git push && git push --tags
```

Step 3 triggers two GitHub Actions pipelines automatically (no manual action needed after the push):

- **CI** — runs on every push to `main` and on every PR. Executes typecheck + tests on Node 20 and Node 22.
- **Publish** — runs only when a `v*` tag is pushed. Runs tests + build and publishes to npm using Trusted Publishing (no tokens stored as secrets).

### CI/CD pipelines

```
push to main / PR open
        │
        ▼
    [CI workflow]
    ├── Node 20: typecheck + tests
    └── Node 22: typecheck + tests

push tag v*
        │
        ▼
    [Publish workflow]
    ├── tests + build  (via prepublishOnly)
    └── npm publish --provenance  (via Trusted Publishing / OIDC)
```
---

## License

MIT
