# CUR002 — Template Variables in Custom Route Responses

## Summary

A developer uses `{{variable}}` placeholders in a custom route's `response.body` so that
yrest resolves them against the incoming request at handler time. This allows the mock
response to reflect request params, body fields, query strings, or generated values like
timestamps and UUIDs — without writing any code.

## Actor

Developer (user of the yrest CLI)

## Preconditions

- yrest is installed (`npm install -D @aggiovato/yrest` or via `npx`)
- A `db.yml` file with a `_routes` block exists
- At least one route has `response.body` containing one or more `{{variable}}` placeholders

## Available Variables

| Placeholder     | Resolves to                                             |
| --------------- | ------------------------------------------------------- |
| `{{params.X}}`  | Path parameter `:X` from the request URL                |
| `{{query.X}}`   | Query string parameter `?X=` (first value if repeated)  |
| `{{body}}`      | The full request body (object or array)                 |
| `{{body.X}}`    | Field `X` from the request body (dot-notation)          |
| `{{headers.X}}` | Request header `X` (first value if multi-value)         |
| `{{now}}`       | ISO 8601 timestamp generated at response time           |
| `{{uuid}}`      | UUID v4 generated at response time (unique per request) |

## Main Flow

1. Developer defines a custom route in `db.yml` with `{{}}` placeholders in `response.body`.
2. Developer runs `yrest serve db.yml`.
3. yrest reads `_routes`, detects placeholders in each route's body, and marks those routes as dynamic.
4. A client sends a request matching the route's method and path.
5. yrest resolves each `{{variable}}` against the live request context.
6. If a placeholder is the **entire** value of a field (`"{{body}}"`), the resolved value keeps
   its original type (object, array, number). If embedded in a larger string
   (`"User {{params.id}} logged in"`), the variable is stringified.
7. yrest returns the interpolated body with the configured status code.

## Alternative Flows

### Alt-1: Unknown variable name

If a placeholder references an unknown path (e.g. `{{foo.bar}}` where `foo` is not a
supported prefix), it resolves to an empty string `""` in string context, or `""` in
exact-match context. No error is thrown.

### Alt-2: Variable resolves to `undefined`

If `{{params.id}}` is used but the route path has no `:id` segment, the value resolves
to `""`. The response still returns 200 with the partially-interpolated body.

### Alt-3: Route has no placeholders (static body)

Routes without `{{` in the body skip interpolation entirely. No performance overhead.
Existing static routes (CUR001) are unaffected.

### Alt-4: `{{body}}` when request has no body

If the request body is absent or null, `{{body}}` resolves to `null` when used as an
exact placeholder, or `""` when embedded in a string.

### Alt-5: Same placeholder appears multiple times

Each occurrence is resolved independently. `{{uuid}}` generates a different UUID per
occurrence; `{{now}}` generates the same timestamp within one request (called once per
occurrence, so values may differ by microseconds).

## Postconditions

- The response body contains resolved values from the request context.
- Each request to the same route can return a different body depending on its params/body.
- Routes remain static at the Fastify level (no dynamic route registration).
- The route still appears in `/_about` under "Custom routes".

## YAML Example

```yaml
_routes:
  # Path param interpolation
  - method: GET
    path: /users/:id/summary
    response:
      status: 200
      body:
        requestedId: "{{params.id}}"
        generatedAt: "{{now}}"
        message: "Summary for user {{params.id}}"

  # Echo endpoint — reflects the full request body
  - method: POST
    path: /echo
    response:
      status: 200
      body:
        received: "{{body}}"
        requestId: "{{uuid}}"

  # Body field access
  - method: POST
    path: /greet
    response:
      status: 200
      body:
        greeting: "Hello, {{body.name}}!"
        email: "{{body.email}}"

  # Query string
  - method: GET
    path: /search
    response:
      status: 200
      body:
        query: "{{query.q}}"
        results: []
```

## Request & Response Examples

```bash
# Path param
curl http://localhost:3070/users/42/summary
```

```json
{
  "requestedId": "42",
  "generatedAt": "2026-06-09T10:30:00.000Z",
  "message": "Summary for user 42"
}
```

```bash
# Echo — full body reflected
curl -X POST http://localhost:3070/echo \
  -H "Content-Type: application/json" \
  -d '{"email": "ana@test.com", "role": "admin"}'
```

```json
{
  "received": { "email": "ana@test.com", "role": "admin" },
  "requestId": "a3f1c2d4-..."
}
```

```bash
# Body field access
curl -X POST http://localhost:3070/greet \
  -H "Content-Type: application/json" \
  -d '{"name": "Luis", "email": "luis@test.com"}'
```

```json
{
  "greeting": "Hello, Luis!",
  "email": "luis@test.com"
}
```

```bash
# Query string
curl "http://localhost:3070/search?q=typescript"
```

```json
{
  "query": "typescript",
  "results": []
}
```

## Error Cases

| Condition                                      | Behaviour                                 |
| ---------------------------------------------- | ----------------------------------------- |
| Unknown placeholder prefix (`{{foo.x}}`)       | Resolves to `""`, no error                |
| Missing path param (`:id` absent from path)    | `{{params.id}}` resolves to `""`          |
| Missing query param                            | `{{query.x}}` resolves to `""`            |
| Body absent, `{{body.x}}` used                 | Resolves to `""` (body is `null`)         |
| Template in non-string field (number, boolean) | Field is returned as-is, no interpolation |

## Notes

- Template resolution is **pure** — it does not modify the YAML storage or any server state.
- `{{uuid}}` and `{{now}}` are resolved per placeholder occurrence, not per request. Two
  `{{uuid}}` placeholders in the same body will produce two different UUIDs.
- `--readonly` mode still blocks mutating custom routes (POST/PUT/PATCH/DELETE), regardless
  of whether they use templates. The readonly guard runs before the route handler.
- For conditional responses based on request content, see Phase 4D (handler functions).
