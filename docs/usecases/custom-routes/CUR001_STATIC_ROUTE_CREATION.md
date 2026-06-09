# CUR001 — Static Custom Route Creation

## Summary

A developer defines a custom route in `db.yml` under `_routes` and yrest exposes
it as a static HTTP endpoint that always returns the pre-configured response.

## Actor

Developer (user of the yrest CLI)

## Preconditions

- yrest is installed (`npm install -D @aggiovato/yrest` or via `npx`)
- A `db.yml` file exists (or will be created) in the working directory
- The yrest server is not yet running, or will be restarted after editing `db.yml`

## Main Flow

1. Developer opens `db.yml` and adds a `_routes` block with one or more entries.
2. Each entry specifies: `method`, `path`, and `response` (with `status` and/or `body`).
3. Developer runs `yrest serve db.yml`.
4. yrest reads `_routes` from the YAML, validates the entries, and registers each as a
   Fastify route before registering any collection routes.
5. Developer sends an HTTP request matching the custom route's method + path.
6. yrest returns the pre-configured `response.status` (default: 200) and `response.body`.

## Alternative Flows

### Alt-1: Route path conflicts with a collection name

If `_routes` contains `GET /users` and the YAML also has a `users` collection,
the custom route takes priority (registered first in Fastify). The collection's
`GET /users` is shadowed.

This is intentional — custom routes are explicit overrides.

### Alt-2: Entry is missing `method` or `path`

yrest silently skips entries that have no `method` or no `path`.
All other valid entries are still registered. No error is thrown at startup.

### Alt-3: Server runs with `--base /api`

The configured `base` prefix is prepended to every custom route path.
A `path: /auth/me` with `--base /api` becomes `/api/auth/me`.

### Alt-4: Status 204 with no body

When `response.status` is 204 and `response.body` is absent or null,
yrest sends an empty response body (`Content-Length: 0`).

## Postconditions

- The custom route is accessible at `{host}:{port}{base}{path}`.
- Every request to that method+path returns the same static response.
- The custom route appears in `/_about` under the "Custom routes" accordion.
- Collection routes are unaffected (registered separately, lower priority).

## YAML Example

```yaml
_routes:
  - method: GET
    path: /auth/me
    response:
      status: 200
      body:
        id: 1
        name: Ana
        role: admin

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

users:
  - id: 1
    name: Ana
```

## Request & Response Examples

```bash
# GET custom route
curl http://localhost:3070/auth/me
```

```json
{
  "id": 1,
  "name": "Ana",
  "role": "admin"
}
```

```bash
# POST returning token
curl -X POST http://localhost:3070/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ana@test.com", "password": "secret"}'
```

```json
{
  "token": "fake-jwt-token-abc123"
}
```

```bash
# POST with 204 — no body
curl -X POST http://localhost:3070/logout
# HTTP/1.1 204 No Content
```

```bash
# With --base /api
yrest serve db.yml --base /api
curl http://localhost:3070/api/auth/me
```

## Error Cases

| Condition                                          | HTTP Status | Response                   |
| -------------------------------------------------- | ----------- | -------------------------- |
| Path not defined in `_routes` and not a collection | 404         | `{ "error": "Not Found" }` |
| Method defined in `_routes` but wrong method used  | 404         | `{ "error": "Not Found" }` |

## Notes

- Custom routes are **always static** in Phase 4 (Option A). The response body cannot
  reference request params, body, or query strings.
- The `response.headers` field allows setting additional HTTP headers on the response.
  See `CUR002` for that use case.
- `--readonly` mode still blocks `POST`, `PUT`, `PATCH`, `DELETE` custom routes,
  because the readonly guard is a global hook that runs before route handlers.
