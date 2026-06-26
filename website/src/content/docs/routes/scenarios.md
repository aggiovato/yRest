---
title: Scenarios
description: Return different responses from a single route based on request conditions — login flows, permission checks, error states, all without code
---

Scenarios let a single `_routes` entry return different responses depending on the incoming request. A `_scenarios` array defines the conditions; the first match wins. `_otherwise` is the explicit fallback when none match.

This is how you mock a real login flow, simulate role-based access, or inject errors for specific inputs — all directly in `db.yml`, with no handler code.

---

## Basic structure

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
            token: tok-ana-abc
            role: admin
    _otherwise:
      _status: 401
      _body:
        error: Invalid credentials
```

- `_scenarios` is an array evaluated in declaration order — the **first match wins**.
- `_when` defines the conditions the request must satisfy.
- `_otherwise` is the response returned when no scenario matched. If `_otherwise` is absent and no scenario matches, yRest falls back to the top-level `_response` block.

---

## AND conditions — `_when` as an object

When `_when` is a YAML mapping, **all entries must match** (AND logic):

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
          _body: { token: tok-ana, role: admin }
    _otherwise:
      _status: 401
      _body: { error: Invalid credentials }
```

The scenario above only fires when **both** `body.email` equals `ana@company.com` **and** `body.password` equals `secret123`. Sending the correct email but the wrong password hits `_otherwise`.

---

## OR conditions — `_when` as an array

When `_when` is a YAML sequence, **any group can match** (OR of ANDs). Each item in the array is itself an AND group:

```yaml
_routes:
  - _method: GET
    _path: /admin/dashboard
    _scenarios:
      - _when:
          - { headers.x-user-role: admin }
          - { headers.x-user-role: superadmin }
          - { headers.x-user-role: manager }
        _response:
          _status: 200
          _body:
            section: dashboard
            access: granted
    _otherwise:
      _status: 403
      _body: { error: Insufficient permissions }
```

Each item in the `_when` array is evaluated independently. If **any** group matches, the scenario fires.

You can mix multi-field AND groups inside the OR array:

```yaml
_routes:
  - _method: POST
    _path: /payments/refund
    _scenarios:
      - _when:
          - { body.reason: duplicate, body.status: pending }
          - { body.reason: fraud }
        _response:
          _status: 200
          _body:
            refundId: "{{uuid}}"
            status: approved
            processedAt: "{{now}}"
    _otherwise:
      _status: 422
      _body:
        error: Refund not eligible
        reason: "{{body.reason}}"
```

The first group — `reason: duplicate AND status: pending` — is one AND block. The second — `reason: fraud` — is another. Either match triggers the refund approval.

---

## Condition keys

Conditions use dot-notation to access parts of the request:

| Key prefix  | Accesses                                          |
| ----------- | ------------------------------------------------- |
| `body.X`    | Field `X` from the parsed JSON request body       |
| `params.X`  | Path parameter `:X` from the URL                  |
| `query.X`   | Query string value for key `X`                    |
| `headers.X` | Request header value for key `X` (lowercase name) |

```yaml
_routes:
  # Condition on a path param
  - _method: GET
    _path: /users/:id/profile
    _scenarios:
      - _when:
          params.id: "1"
        _response:
          _status: 200
          _body: { id: 1, name: Ana, role: admin, plan: pro }
    _otherwise:
      _status: 200
      _body: { id: "{{params.id}}", name: Generic User, role: viewer, plan: free }

  # Condition on a query string value
  - _method: GET
    _path: /invoices
    _scenarios:
      - _when:
          query.status: overdue
        _response:
          _status: 200
          _body:
            - { id: 1, amount: 1200.00, dueDate: "2026-01-15", status: overdue }
            - { id: 4, amount: 450.00, dueDate: "2026-02-01", status: overdue }
    _otherwise:
      _status: 200
      _body: []
```

---

## Operator suffixes

Condition keys support the same operator suffixes as query parameters. Append the suffix to the dot-notation key:

| Suffix   | Description                            | Example                           |
| -------- | -------------------------------------- | --------------------------------- |
| `_gte`   | Greater than or equal (numeric/string) | `body.amount_gte: 100`            |
| `_lte`   | Less than or equal (numeric/string)    | `body.amount_lte: 500`            |
| `_ne`    | Not equal                              | `body.status_ne: cancelled`       |
| `_like`  | Case-insensitive substring match       | `body.email_like: "@company.com"` |
| `_start` | Case-insensitive prefix match          | `body.coupon_start: PROMO`        |
| `_regex` | Case-insensitive regex match           | `body.phone_regex: "^\\+1"`       |

```yaml
_routes:
  - _method: POST
    _path: /checkout
    _scenarios:
      # Block suspicious large orders
      - _when:
          body.total_gte: 10000
        _response:
          _status: 422
          _body:
            error: Order exceeds limit
            maxAllowed: 9999.99
            submitted: "{{body.total}}"

      # Apply discount for company emails
      - _when:
          body.email_like: "@company.com"
        _response:
          _status: 200
          _body:
            orderId: "{{uuid}}"
            discount: 0.15
            message: Employee discount applied
            processedAt: "{{now}}"
    _otherwise:
      _status: 200
      _body:
        orderId: "{{uuid}}"
        discount: 0
        processedAt: "{{now}}"
```

---

## The `_otherwise` fallback

`_otherwise` runs when `_scenarios` is defined but no scenario matched. It is more explicit than `_response` because it signals that something was evaluated but no branch triggered:

```yaml
_routes:
  - _method: DELETE
    _path: /users/:id
    _scenarios:
      - _when:
          headers.x-confirm-delete: "yes"
        _response:
          _status: 200
          _body:
            deleted: true
            userId: "{{params.id}}"
            deletedAt: "{{now}}"
    _otherwise:
      _status: 400
      _body:
        error: Delete not confirmed
        hint: Set the X-Confirm-Delete header to "yes"
```

If `_otherwise` is absent and no scenario matches, yRest falls back to the top-level `_response` block. If that is also absent, it returns `200` with a `null` body.

---

## Per-route delay

`_delay` adds simulated latency (in milliseconds) before any response — including `_otherwise` and `_error` responses:

```yaml
_routes:
  - _method: POST
    _path: /auth/login
    _delay: 600
    _scenarios:
      - _when:
          body.email: ana@company.com
          body.password: secret123
        _response:
          _status: 200
          _body: { token: tok-ana-abc, expiresIn: 3600 }
    _otherwise:
      _status: 401
      _body: { error: Invalid credentials }
```

Every request to `POST /auth/login` waits 600 ms before a response is sent, regardless of which branch resolves the reply.

---

## Error injection in scenarios

Use `_status` inside a scenario `_response` to return an error for specific conditions:

```yaml
_routes:
  - _method: POST
    _path: /payments/charge
    _scenarios:
      - _when:
          body.cardNumber: "4000-0000-0000-0002"
        _response:
          _status: 402
          _body:
            error: Card declined
            code: INSUFFICIENT_FUNDS
            cardLast4: "0002"

      - _when:
          body.cardNumber: "4000-0000-0000-0119"
        _response:
          _status: 402
          _body:
            error: Card declined
            code: STOLEN_CARD
            cardLast4: "0119"
    _otherwise:
      _status: 200
      _body:
        chargeId: "{{uuid}}"
        status: approved
        amount: "{{body.amount}}"
        processedAt: "{{now}}"
```

This is different from the top-level `_error` key — that key **always** forces an error regardless of the request. Scenario-based errors only fire when the `_when` condition matches.

---

## Template variables in scenario responses

All `{{variable}}` template variables work inside `_response._body` and `_otherwise._body` within scenarios:

```yaml
_routes:
  - _method: POST
    _path: /support/ticket
    _scenarios:
      - _when:
          body.priority: urgent
        _response:
          _status: 201
          _body:
            ticketId: "{{uuid}}"
            priority: urgent
            assignedTo: on-call-team
            eta: 30 minutes
            createdAt: "{{now}}"
            submittedBy: "{{body.email}}"
    _otherwise:
      _status: 201
      _body:
        ticketId: "{{uuid}}"
        priority: normal
        assignedTo: support-queue
        eta: 2 business days
        createdAt: "{{now}}"
        submittedBy: "{{body.email}}"
```

See [Template Variables](/routes/templates/) for the full list of available variables.

---

## Reference

| Key          | Type                                  | Description                                                  |
| ------------ | ------------------------------------- | ------------------------------------------------------------ |
| `_scenarios` | array of scenario objects             | List of conditional branches, evaluated in declaration order |
| `_when`      | object (AND) or array of objects (OR) | Conditions to evaluate against the request                   |
| `_response`  | `{ _status?, _body?, _headers? }`     | Response to return when this scenario's `_when` matches      |
| `_otherwise` | `{ _status?, _body?, _headers? }`     | Response when `_scenarios` is defined but none matched       |
| `_delay`     | integer (ms)                          | Per-route latency applied before any response                |

**`_when` condition keys:**

| Pattern        | Matches                                        |
| -------------- | ---------------------------------------------- |
| `body.X`       | Field `X` in the parsed request body           |
| `body.X.Y`     | Nested field (`X.Y`) in the request body       |
| `params.X`     | Path parameter `:X`                            |
| `query.X`      | Query string value for key `X`                 |
| `headers.X`    | Request header (use lowercase header name)     |
| `body.X_gte`   | Field `X` >= value (numeric or lexicographic)  |
| `body.X_lte`   | Field `X` <= value                             |
| `body.X_ne`    | Field `X` ≠ value                              |
| `body.X_like`  | Field `X` contains value (case-insensitive)    |
| `body.X_start` | Field `X` starts with value (case-insensitive) |
| `body.X_regex` | Field `X` matches regex (case-insensitive)     |

---

## Examples

### Multi-user login mock

Support several test accounts with distinct roles, each returning its own token:

```yaml
_routes:
  - _method: POST
    _path: /auth/login
    _delay: 400
    _scenarios:
      - _when:
          body.email: admin@company.com
          body.password: adminpass
        _response:
          _status: 200
          _body:
            token: tok-admin-xyz789
            user: { id: 1, name: Admin User, role: admin }
            loginAt: "{{now}}"

      - _when:
          body.email: editor@company.com
          body.password: editorpass
        _response:
          _status: 200
          _body:
            token: tok-editor-abc456
            user: { id: 2, name: Editor User, role: editor }
            loginAt: "{{now}}"

      - _when:
          body.email_like: "@company.com"
          body.password_ne: ""
        _response:
          _status: 200
          _body:
            token: tok-generic-aaa111
            user: { id: 99, name: Company User, role: viewer }
            loginAt: "{{now}}"
    _otherwise:
      _status: 401
      _body:
        error: Invalid credentials
        email: "{{body.email}}"
```

### Role-based access control

Return content based on the role sent in a header:

```yaml
_routes:
  - _method: GET
    _path: /billing/invoices
    _scenarios:
      - _when:
          - { headers.x-user-role: admin }
          - { headers.x-user-role: billing }
        _response:
          _status: 200
          _body:
            invoices:
              - { id: 1, amount: 1200.00, status: paid }
              - { id: 2, amount: 450.00, status: pending }
            total: 2
      - _when:
          headers.x-user-role: viewer
        _response:
          _status: 403
          _body:
            error: Read-only users cannot access billing
            role: viewer
    _otherwise:
      _status: 401
      _body: { error: No role provided }
```

### Payment gateway simulation

Test all the card failure scenarios your frontend needs to handle:

```yaml
_routes:
  - _method: POST
    _path: /payments/charge
    _delay: 1200
    _scenarios:
      - _when:
          body.cardNumber: "4000-0000-0000-0002"
        _response:
          _status: 402
          _body: { error: Card declined, code: INSUFFICIENT_FUNDS }

      - _when:
          body.cardNumber: "4000-0000-0000-9995"
        _response:
          _status: 402
          _body: { error: Card declined, code: DO_NOT_HONOR }

      - _when:
          body.amount_gte: 10000
        _response:
          _status: 422
          _body:
            error: Amount exceeds single-transaction limit
            limit: 9999.99
            submitted: "{{body.amount}}"

      - _when:
          body.currency_ne: USD
        _response:
          _status: 422
          _body:
            error: Currency not supported
            accepted: [USD]
            submitted: "{{body.currency}}"
    _otherwise:
      _status: 200
      _body:
        chargeId: "{{uuid}}"
        status: approved
        amount: "{{body.amount}}"
        currency: "{{body.currency}}"
        processedAt: "{{now}}"
```

### Invite code validation

Accept a few valid codes, reject everything else:

```yaml
_routes:
  - _method: POST
    _path: /onboarding/verify-code
    _scenarios:
      - _when:
          - { body.code: BETA2026 }
          - { body.code: EARLYBIRD }
          - { body.code: PARTNER99 }
        _response:
          _status: 200
          _body:
            valid: true
            plan: pro
            discount: 0.20
            activatedAt: "{{now}}"
    _otherwise:
      _status: 400
      _body:
        valid: false
        error: Invalid or expired invite code
        submitted: "{{body.code}}"
```

---

## Next steps

- [Template Variables](/routes/templates/) — use `{{now}}`, `{{body.X}}` and others in scenario responses
- [Handler Functions](/routes/handlers/) — full programmatic control when scenarios aren't enough
- [Static Routes](/routes/static/) — the full `_routes` reference with headers, delay and error injection
