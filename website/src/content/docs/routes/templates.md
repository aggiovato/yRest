---
title: Template Variables
description: Interpolate path params, query strings, body fields, timestamps and UUIDs into static route responses with {{}} syntax
---

Template variables let a static route response include data from the incoming request — without writing any code. They use a `{{variable}}` syntax resolved at request time, making it easy to build echo endpoints, contextual responses and dynamic feedback without handlers.

Variables work inside any string value in `_response._body`, `_scenarios[]._response._body`, `_otherwise._body`, and SSE event `_data` fields.

---

## Available variables

| Variable       | Resolves to                                              |
| -------------- | -------------------------------------------------------- |
| `{{params.X}}` | Path parameter `:X` from the route                       |
| `{{query.X}}`  | Query string value for key `X` (first value if repeated) |
| `{{body}}`     | Full request body, serialised as JSON                    |
| `{{body.X}}`   | Nested field `X` from the request body (dot-notation)    |
| `{{now}}`      | Current timestamp in ISO 8601 format                     |
| `{{uuid}}`     | A freshly generated UUID v4                              |

---

## Path parameters

Use `{{params.X}}` to echo a value captured from the URL:

```yaml
_routes:
  - _method: GET
    _path: /users/:id/summary
    _response:
      _status: 200
      _body:
        requestedId: "{{params.id}}"
        message: "Fetching summary for user {{params.id}}"
        fetchedAt: "{{now}}"
```

```bash
GET /users/42/summary
→ { "requestedId": "42", "message": "Fetching summary for user 42", "fetchedAt": "2026-06-26T..." }
```

When a template string is the **entire value** — like `"{{params.id}}"` — the resolved value preserves its original type. When it's **embedded in a larger string** — like `"user {{params.id}}"` — it is stringified.

---

## Query string values

Use `{{query.X}}` to include query parameters in the response:

```yaml
_routes:
  - _method: GET
    _path: /search/preview
    _response:
      _status: 200
      _body:
        query: "{{query.q}}"
        page: "{{query.page}}"
        results: []
        note: "Showing preview for '{{query.q}}'"
```

```bash
GET /search/preview?q=typescript&page=2
→ { "query": "typescript", "page": "2", "results": [], "note": "Showing preview for 'typescript'" }
```

If the query param is absent, `{{query.X}}` resolves to an empty string.

---

## Request body fields

Use `{{body}}` to echo the entire request body, or `{{body.X}}` for a specific field:

```yaml
_routes:
  - _method: POST
    _path: /echo
    _response:
      _status: 200
      _body:
        received: "{{body}}"
        timestamp: "{{now}}"
        requestId: "{{uuid}}"

  - _method: POST
    _path: /auth/login
    _response:
      _status: 200
      _body:
        token: fake-jwt-abc123
        loginAs: "{{body.email}}"
        authenticatedAt: "{{now}}"
```

```bash
POST /echo
{ "event": "page_view", "url": "/dashboard" }

→ {
    "received": { "event": "page_view", "url": "/dashboard" },
    "timestamp": "2026-06-26T10:30:00.000Z",
    "requestId": "b4e7c1f2-9a3d-4e8b-b5c6-1d2e3f4a5b6c"
  }
```

`{{body}}` preserves the full parsed object — it's not a JSON string. `{{body.X}}` uses dot-notation so you can reach nested fields:

```yaml
_routes:
  - _method: POST
    _path: /orders
    _response:
      _status: 201
      _body:
        orderId: "{{uuid}}"
        customer: "{{body.customer.name}}"
        email: "{{body.customer.email}}"
        itemCount: "{{body.items}}"
        createdAt: "{{now}}"
```

```bash
POST /orders
{
  "customer": { "name": "Ana Martínez", "email": "ana@company.com" },
  "items": 3
}

→ {
    "orderId": "a3f1c2d4-...",
    "customer": "Ana Martínez",
    "email": "ana@company.com",
    "itemCount": 3,
    "createdAt": "2026-06-26T..."
  }
```

---

## Timestamps and UUIDs

`{{now}}` returns the current time in ISO 8601 format. `{{uuid}}` generates a fresh UUID v4 on every request:

```yaml
_routes:
  - _method: POST
    _path: /events/track
    _response:
      _status: 202
      _body:
        eventId: "{{uuid}}"
        receivedAt: "{{now}}"
        status: queued
```

```bash
POST /events/track
→ { "eventId": "c9d2e3f4-...", "receivedAt": "2026-06-26T10:30:00.000Z", "status": "queued" }
```

Every call to the endpoint generates a **new** UUID and a **new** timestamp — they are not cached between requests.

---

## Using in scenarios

Template variables work inside `_scenarios[]._ response._body` and `_otherwise._body`:

```yaml
_routes:
  - _method: POST
    _path: /auth/login
    _scenarios:
      - _when:
          body.email: ana@company.com
          body.password: secret123
        _response:
          _status: 200
          _body:
            token: tok-ana-abc123
            user: "{{body.email}}"
            loginAt: "{{now}}"
      - _when:
          body.email: luis@company.com
          body.password: pass456
        _response:
          _status: 200
          _body:
            token: tok-luis-def456
            user: "{{body.email}}"
            loginAt: "{{now}}"
    _otherwise:
      _status: 401
      _body:
        error: Invalid credentials
        attemptedEmail: "{{body.email}}"
```

The `_otherwise` block here echoes the email that failed — useful for debugging in the frontend.

---

## Using in SSE event data

Template variables in SSE streams are resolved **per frame** at emit time. `{{now}}` and `{{uuid}}` produce a new value on every event:

```yaml
_routes:
  - _method: SSE
    _path: /events/ticker
    _sse:
      _interval: 2000
      _loop: true
      _events:
        - _event: tick
          _data:
            frameId: "{{uuid}}"
            ts: "{{now}}"
            source: live-feed
```

See [SSE Streams](/routes/sse/) for the full SSE reference.

---

## Type preservation

When a template string is the **exact and only value** in a field — `"{{body.count}}"` — the resolved value keeps its original type:

```yaml
_body:
  count: "{{body.count}}" # resolves as number if body.count is a number
  id: "{{params.id}}" # resolves as string (path params are always strings)
  payload: "{{body}}" # resolves as object
```

When a template is **embedded in a longer string** — `"Item {{params.id}}"` — the resolved value is always stringified:

```yaml
_body:
  label: "Item {{params.id}}" # always a string: "Item 42"
```

---

## Examples

### Audit log endpoint

Record who requested what and when — no storage needed:

```yaml
_routes:
  - _method: POST
    _path: /audit/log
    _response:
      _status: 202
      _body:
        logId: "{{uuid}}"
        actor: "{{body.userId}}"
        action: "{{body.action}}"
        resource: "{{body.resource}}"
        timestamp: "{{now}}"
        status: accepted
```

### Personalised welcome response

Return a greeting that includes the name sent in the body:

```yaml
_routes:
  - _method: POST
    _path: /onboarding/welcome
    _response:
      _status: 200
      _body:
        message: "Welcome, {{body.firstName}}! Your account is ready."
        accountId: "{{uuid}}"
        createdAt: "{{now}}"
        nextStep: /onboarding/profile
```

### Webhook acknowledgement

Echo back the webhook payload with a tracking ID:

```yaml
_routes:
  - _method: POST
    _path: /webhooks/receive
    _response:
      _status: 200
      _body:
        ack: true
        deliveryId: "{{uuid}}"
        receivedAt: "{{now}}"
        payload: "{{body}}"
```

### Dynamic resource preview

Return a preview of what a new resource would look like before the frontend commits to creating it:

```yaml
_routes:
  - _method: POST
    _path: /products/preview
    _response:
      _status: 200
      _body:
        id: "{{uuid}}"
        name: "{{body.name}}"
        slug: "{{body.name}}"
        price: "{{body.price}}"
        category: "{{body.category}}"
        createdAt: "{{now}}"
        status: preview
```

---

## Next steps

- [Static Routes](/routes/static/) — define the routes that use template variables
- [Scenarios](/routes/scenarios/) — combine template variables with conditional logic
- [SSE Streams](/routes/sse/) — template variables resolved per frame in event data
