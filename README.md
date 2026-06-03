# yrest

Zero-config REST API mock server powered by a YAML file.

Define your data in a `db.yml` file and get a fully functional CRUD REST API in seconds — no backend required.

## Install

```bash
npm install -D yrest
```

Or run directly with npx:

```bash
npx yrest serve db.yml
```

## Quick start

```bash
# Create a sample db.yml in the current directory
npx yrest init

# Start the server
npx yrest serve db.yml
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
yrest init
yrest init --file api.yml   # custom filename
```

### `serve`

Starts the mock server.

```bash
yrest serve db.yml
yrest serve db.yml --port 3001
yrest serve db.yml --host 0.0.0.0
yrest serve db.yml --base /api
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

## License

MIT
