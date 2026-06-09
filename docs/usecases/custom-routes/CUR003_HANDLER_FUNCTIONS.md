# CUR003 — Handler Functions for Custom Routes

## Summary

A developer creates a `yrest.handlers.js` file exporting named async functions, references
them by name in `_routes` via the `handler:` field, and yrest calls the function on every
matching request — passing the live request context and using the returned value as the
HTTP response. This enables real business logic in mock routes without modifying the server.

## Actor

Developer (user of the yrest CLI)

## Preconditions

- yrest is installed (`npm install -D @aggiovato/yrest` or via `npx`)
- A `db.yml` file with a `_routes` block exists (or will be created)
- The `handlers:` path is set in `yrest.config.yml` (or via `--handlers` CLI flag)
- The referenced JavaScript file exports functions matching the names used in `_routes`

## Main Flow

1. Developer configures the handler file path in `yrest.config.yml`:

   ```yaml
   handlers: ./yrest.handlers.js
   ```

2. Developer creates the handler file with exported async functions:

   ```js
   export async function login(req) {
     if (req.body?.password !== "secret") return { status: 401, body: { error: "Unauthorized" } };
     return { status: 200, body: { token: `tok-${req.body.email}` } };
   }
   ```

3. Developer references the function by name in `_routes`:

   ```yaml
   _routes:
     - method: POST
       path: /login
       handler: login
   ```

4. Developer runs `yrest serve db.yml`.

5. yrest loads the handler file via dynamic `import()`, builds a function map by name,
   and passes it to the server.

6. A client sends `POST /login`. yrest calls `login({ params, query, body, headers })`.

7. The function returns `{ status, body, headers }`. yrest sends the HTTP response.

## Alternative Flows

### Alt-1: Scaffold with `yrest handler`

```bash
# Create stub only
yrest handler login

# Create stub with method/path hints in JSDoc
yrest handler login --method POST --path /login

# Create stub AND add _routes entry to db.yml
yrest handler login --method POST --path /login --register
```

The command appends to `yrest.handlers.js` (creating it if absent) and optionally
updates `db.yml` with the `_routes` entry. Uses the `handlers:` path from `yrest.config.yml`.

### Alt-2: Handler name not found in the file

If `handler: login` is declared but the function is not exported from the handlers file,
yrest responds with `501 Not Implemented` and a message naming the missing handler.
The server does not crash.

### Alt-3: Handler throws an error

If the handler function throws at runtime, yrest catches the error and responds with
`500 Internal Server Error` including the error message. Other routes are unaffected.

### Alt-4: `handler:` and `response:` both set

`handler:` takes priority. `response:` is used only as a fallback when the handler name
is not found in the map (Alt-2). This allows safe degradation.

### Alt-5: Handlers file absent or not configured

If `handlers:` is not set in the config (and `--handlers` is not passed), no handlers are
loaded. Routes with `handler:` return 501. Routes without `handler:` work normally.
If the file path is configured but the file does not exist, the same applies — no error
at startup, 501 at request time.

### Alt-6: Handler file fails to import

If the handlers file exists but `import()` throws (syntax error, missing dependency),
yrest logs the error to stderr and starts with an empty handler map. The server still
starts and serves all routes; only `handler:` routes return 501.

## Postconditions

- Requests to handler-backed routes receive dynamically computed responses.
- Handler routes appear in the startup output under "Custom routes" with a `→ handlerName()` label.
- Collection routes and static custom routes are unaffected.
- The handlers file is loaded once at startup (not per-request).

## Handler Signature

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

All types are exported from `@aggiovato/yrest` for use in TypeScript or JSDoc.

## YAML + Handler File Example

```yaml
# yrest.config.yml
handlers: ./yrest.handlers.js
```

```yaml
# db.yml
users:
  - id: 1
    name: Ana

_routes:
  - method: POST
    path: /login
    handler: login
    response: # fallback if handler not found
      status: 200
      body: { token: fallback }

  - method: GET
    path: /auth/me
    handler: me

  - method: POST
    path: /logout
    handler: logout

  - method: GET
    path: /users/:id/summary
    handler: userSummary
```

```js
// yrest.handlers.js
export async function login(req) {
  const { email, password } = req.body ?? {};
  if (password !== "secret") return { status: 401, body: { error: "Invalid credentials" } };
  return { status: 200, body: { token: `tok-${email}` } };
}

export async function me() {
  return { status: 200, body: { id: 1, name: "Ana", role: "admin" } };
}

export async function logout() {
  return { status: 204 };
}

export async function userSummary(req) {
  return {
    status: 200,
    body: { userId: req.params.id, fetchedAt: new Date().toISOString() },
  };
}
```

## Request & Response Examples

```bash
# Valid login
curl -X POST http://localhost:3070/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ana@test.com", "password": "secret"}'
```

```json
{ "token": "tok-ana@test.com" }
```

```bash
# Invalid login
curl -X POST http://localhost:3070/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ana@test.com", "password": "wrong"}'
# HTTP 401
```

```json
{ "error": "Invalid credentials" }
```

```bash
# Path param in handler
curl http://localhost:3070/users/42/summary
```

```json
{ "userId": "42", "fetchedAt": "2026-06-09T10:30:00.000Z" }
```

## Error Cases

| Condition                                        | HTTP Status | Response                                        |
| ------------------------------------------------ | ----------- | ----------------------------------------------- |
| `handler:` name not in handlers file             | 501         | `{ "error": "Handler \"X\" is not defined…" }`  |
| Handler function throws an error                 | 500         | `{ "error": "Handler \"X\" threw: <message>" }` |
| Handlers file import fails (syntax error, etc.)  | 501         | Server starts; all handler routes return 501    |
| `handler:` with no `response:` fallback, 501 hit | 501         | Same as above                                   |

## Notes

- The handlers file is loaded once at startup via `import()`. Changes require a server restart
  (watch mode reloads only the YAML, not the handlers file).
- TypeScript users can use `tsx yrest serve db.yml` to write handlers in `.ts` files.
  `tsx` is not a dependency of yrest — install it separately if needed.
- `--readonly` mode still blocks POST/PUT/PATCH/DELETE handler routes (global hook runs first).
- Two `{{variable}}` placeholders (Phase 4B) and `handler:` (Phase 4D) are mutually exclusive
  per route. When `handler:` is set, `response.body` is only used as a 501 fallback.
