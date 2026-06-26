---
title: Static Routes
description: Define non-CRUD endpoints in _routes — auth mocks, health checks, error injection and fixed payloads
---

The `_routes` block lets you define endpoints that don't map to any collection. Think login flows, health checks, dashboard stats, feature flags — any endpoint that returns a fixed or controlled response without hitting a CRUD resource.

Custom routes are registered **before** collection routes and always take priority over them.

---

## Basic route definition

Each entry in `_routes` requires a `_method` and a `_path`. All yRest-specific keys inside the block start with `_`:

```yaml
_routes:
  - _method: GET
    _path: /health
    _response:
      _status: 200
      _body:
        status: ok
        version: 1.4.0
```

`_method` is case-insensitive. `_path` must start with `/` and follows Fastify's routing syntax, so named path parameters like `:id` work out of the box.

You can define as many routes as you need:

```yaml
_routes:
  - _method: POST
    _path: /auth/login
    _response:
      _status: 200
      _body:
        token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake

  - _method: POST
    _path: /auth/logout
    _response:
      _status: 204

  - _method: GET
    _path: /health
    _response:
      _status: 200
      _body: { status: ok }
```

---

## Response structure

The `_response` block accepts three optional keys:

| Key        | Type                   | Default | Description                                      |
| ---------- | ---------------------- | ------- | ------------------------------------------------ |
| `_status`  | integer                | `200`   | HTTP status code to return                       |
| `_body`    | any YAML value         | `null`  | Response payload — object, array, string, number |
| `_headers` | map of string → string | `{}`    | Additional headers to set in the response        |

```yaml
_routes:
  - _method: GET
    _path: /dashboard/stats
    _response:
      _status: 200
      _headers:
        Cache-Control: no-store
        X-Data-Source: mock
      _body:
        activeUsers: 1248
        revenue: 48320.75
        newSignups: 34
        churnRate: 0.021
```

If `_body` is absent and `_status` is `204`, the response is sent with no body — the correct behaviour for No Content.

---

## Custom headers

Set response headers per route using the `_headers` map inside `_response`:

```yaml
_routes:
  - _method: GET
    _path: /me
    _response:
      _status: 200
      _headers:
        X-Auth-User: "42"
        X-Session-Expires: "2026-12-31T23:59:59Z"
      _body:
        id: 42
        name: Ana Martínez
        email: ana@company.com
        role: admin

  - _method: OPTIONS
    _path: /upload
    _response:
      _status: 204
      _headers:
        Access-Control-Allow-Origin: "*"
        Access-Control-Allow-Methods: POST, OPTIONS
        Access-Control-Allow-Headers: Content-Type, Authorization
```

:::note[Content-Type]
yRest always sets `Content-Type: application/json` for JSON responses. You can override it by declaring `Content-Type` in `_headers` — for example to return plain text or HTML.
:::

---

## Per-route delay

The `_delay` key adds a simulated latency (in milliseconds) to the route. It is applied before any response is sent — including error responses.

```yaml
_routes:
  - _method: POST
    _path: /payments/process
    _delay: 1800
    _response:
      _status: 200
      _body:
        transactionId: txn_7f2a9c
        status: approved
        amount: 149.99

  - _method: GET
    _path: /reports/generate
    _delay: 3000
    _response:
      _status: 200
      _body:
        reportId: rpt_20260626
        rows: 4821
        format: csv
```

`_delay` overrides the global `--delay` flag **for that route only**. A route without `_delay` still inherits the global delay if one is set.

---

## Error injection

The `_error` key forces the route to always return a specific HTTP error status, bypassing the normal response pipeline entirely:

```yaml
_routes:
  - _method: GET
    _path: /payments/gateway
    _error: 503
    _errorBody:
      message: Payment gateway unavailable
      retryAfter: 60

  - _method: POST
    _path: /uploads/avatar
    _error: 413
    _errorBody:
      error: File too large
      maxBytes: 5242880
```

| Key          | Type           | Description                                                                                 |
| ------------ | -------------- | ------------------------------------------------------------------------------------------- |
| `_error`     | integer        | Forces this HTTP status on every request, bypassing `_response`, `_scenarios`, and handlers |
| `_errorBody` | any YAML value | Optional body alongside `_error`. Defaults to `{ error: "Forced error <N>" }` if omitted    |

`_delay` is still applied before the error response — useful for testing timeout handling alongside error states.

:::tip[Simulating flaky services]
Combine `_error` with `_scenarios` to return either a success or an error depending on the request. Remove `_error` from the top level and put it inside a scenario's `_response` to make it conditional.
:::

---

## Resolution priority

When a request hits a custom route, yRest resolves the response in this order:

1. **`_handler`** — if a handler name is specified and found in the handlers file, it takes over completely.
2. **`_handler` missing** — if the name is specified but not found, returns `501`.
3. **First matching `_scenario`** — evaluated in declaration order.
4. **`_otherwise`** — explicit fallback when `_scenarios` are defined but none matched.
5. **`_response`** — static (or template) final fallback.

The `_error` key bypasses steps 1–5 entirely — it is evaluated before everything else.

---

## Reference

| Key          | Type         | Required | Description                                                                  |
| ------------ | ------------ | -------- | ---------------------------------------------------------------------------- |
| `_method`    | string       | yes      | HTTP verb (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)                     |
| `_path`      | string       | yes      | URL path, must start with `/`. Supports `:param` segments                    |
| `_response`  | object       | no       | Static response block (see sub-keys below)                                   |
| `_scenarios` | array        | no       | Conditional response variants — see [Scenarios](/routes/scenarios/)          |
| `_otherwise` | object       | no       | Explicit fallback when no scenario matched                                   |
| `_handler`   | string       | no       | Name of an export in `yrest.handlers.js` — see [Handlers](/routes/handlers/) |
| `_delay`     | integer (ms) | no       | Per-route simulated latency                                                  |
| `_error`     | integer      | no       | Forces this status code on every request                                     |
| `_errorBody` | any          | no       | Body returned alongside `_error`                                             |

**`_response` and `_otherwise` sub-keys:**

| Key        | Type                | Default | Description            |
| ---------- | ------------------- | ------- | ---------------------- |
| `_status`  | integer             | `200`   | HTTP status code       |
| `_body`    | any YAML value      | `null`  | Response payload       |
| `_headers` | map string → string | `{}`    | Extra response headers |

---

## Examples

### Auth flow mock

A login endpoint that always returns a fixed token — useful when the frontend just needs something to store and pass back in headers:

```yaml
_routes:
  - _method: POST
    _path: /auth/login
    _response:
      _status: 200
      _body:
        token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock
        expiresIn: 3600
        user:
          id: 1
          name: Ana Martínez
          email: ana@company.com
          role: admin

  - _method: POST
    _path: /auth/logout
    _response:
      _status: 204

  - _method: POST
    _path: /auth/refresh
    _response:
      _status: 200
      _body:
        token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshed
        expiresIn: 3600
```

### Profile endpoint with headers

Mock a `/me` endpoint that returns the current user plus session metadata in headers:

```yaml
_routes:
  - _method: GET
    _path: /me
    _response:
      _status: 200
      _headers:
        X-Session-Id: sess_a3f2c9d1
        X-Session-Expires: "2026-12-31T23:59:59Z"
        X-Rate-Limit-Remaining: "47"
      _body:
        id: 1
        name: Ana Martínez
        email: ana@company.com
        role: admin
        plan: pro
        avatarUrl: https://api.dicebear.com/7.x/initials/svg?seed=Ana
```

### Service failure simulation

Force a specific service endpoint to always fail — useful to test how the frontend handles outages:

```yaml
_routes:
  - _method: POST
    _path: /notifications/send
    _delay: 400
    _error: 503
    _errorBody:
      error: Notification service temporarily unavailable
      code: NOTIFICATIONS_DOWN
      retryAfter: 30
```

### Feature flags endpoint

Return a flat map of feature flags that the frontend checks at startup:

```yaml
_routes:
  - _method: GET
    _path: /config/features
    _response:
      _status: 200
      _headers:
        Cache-Control: "max-age=300"
      _body:
        darkMode: true
        betaDashboard: false
        newOnboarding: true
        paymentsV2: false
        aiSuggestions: true
```

---

## Next steps

- [Template Variables](/routes/templates/) — interpolate request data into static responses
- [Scenarios](/routes/scenarios/) — return different responses based on request conditions
- [Handler Functions](/routes/handlers/) — add real logic with a JavaScript function
