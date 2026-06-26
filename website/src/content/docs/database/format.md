---
title: yRest Format
description: How to structure your db.yml file — collections, items, reserved keys and the underscore convention
---

`db.yml` is the only file yRest needs to start a full REST API. Every top-level key that does **not** start with `_` becomes a collection with automatic CRUD routes. Everything else — relations, custom routes, field schemas — is expressed through reserved `_`-prefixed keys.

## Minimal example

```yaml
users:
  - id: 1
    name: Ana
    email: ana@example.com
  - id: 2
    name: Luis
    email: luis@example.com
```

Saving this file and running `npx @yrest/cli serve db.yml` exposes:

| Method   | Path         | Description             |
| -------- | ------------ | ----------------------- |
| `GET`    | `/users`     | List all users          |
| `GET`    | `/users/:id` | Get a single user       |
| `POST`   | `/users`     | Create a new user       |
| `PUT`    | `/users/:id` | Replace a user          |
| `PATCH`  | `/users/:id` | Partially update a user |
| `DELETE` | `/users/:id` | Delete a user           |

No code, no configuration, no schema declaration required.

---

## File structure

`db.yml` is a standard YAML file. At the top level it is a mapping — a set of key-value pairs where each key is either a collection name or a yRest directive.

```yaml
# ── Collections (any key without a leading underscore) ──
users:
  - id: 1
    name: Ana

posts:
  - id: 1
    title: Hello World
    userId: 1

# ── yRest directives (keys that start with _) ──
_rel:
  posts:
    userId: users

_routes:
  - method: POST
    path: /login
    response:
      status: 200
      body: { token: fake-jwt }
```

The parser separates keys into two groups at load time:

- Keys **without** a leading `_` → stored as collections, exposed as REST endpoints.
- Keys **with** a leading `_` → interpreted as yRest directives (`_data`, `_rel`, `_routes`, `_schema`).

Collections can also be nested under `_data:` instead of sitting at the root level — see [`_data`](#_data) for details.

---

## Collections

A collection is a YAML key whose value is a **sequence** (a list) of items:

```yaml
products:
  - id: 1
    name: Laptop
    price: 999.99
    inStock: true
  - id: 2
    name: Mouse
    price: 29.99
    inStock: false
```

Each item in the list is a YAML mapping (object). Fields can hold any valid YAML scalar — strings, numbers, booleans, null — as well as nested mappings and sequences.

### Items with nested data

Field values can be nested objects or arrays:

```yaml
users:
  - id: 1
    name: Ana
    address:
      street: "123 Main St"
      city: "Springfield"
      zip: "12345"
    tags:
      - admin
      - editor
```

The nested `address` object and `tags` array are stored and returned as-is in every GET response. You can filter on nested fields using dot-notation query parameters: `?address.city=Springfield`.

### Multiple collections

A single `db.yml` can hold as many collections as you need:

```yaml
users:
  - id: 1
    name: Ana

posts:
  - id: 1
    title: Hello World
    userId: 1

comments:
  - id: 1
    postId: 1
    body: Great post!
    userId: 1

tags:
  - id: 1
    name: typescript
  - id: 2
    name: tooling
```

Each collection gets its own independent set of CRUD routes. Collections are unrelated unless you explicitly link them with `_rel`.

---

## The `id` field

Every item should have an `id` field. yRest uses `id` as the primary key for all single-item routes (`GET /users/1`, `PUT /users/1`, etc.).

### Explicit ids

You can assign ids yourself in the file:

```yaml
users:
  - id: 1
    name: Ana
  - id: 2
    name: Luis
```

Ids can be integers or strings — yRest matches them by value, not by type:

```yaml
categories:
  - id: "electronics"
    label: Electronics
  - id: "clothing"
    label: Clothing
```

### Auto-assigned ids on POST

When a client creates a new item via `POST /users` **without** including an `id` in the request body, yRest assigns one automatically using the configured `idStrategy`:

| Strategy              | Result                                                        |
| --------------------- | ------------------------------------------------------------- |
| `increment` (default) | Next integer above the current maximum `id` in the collection |
| `uuid`                | A random UUID v4 string from `crypto.randomUUID()`            |

The strategy is set in `yrest.config.yml` or as a CLI flag — see [Configuration](/getting-started/configuration/) for details.

### Items without an id

If an item in `db.yml` has no `id` field, it cannot be targeted by single-item routes. This is valid for read-only lookup data where individual access by key is not needed, but it is generally recommended to always include an `id`.

---

## Reserved keys

Any top-level key starting with `_` is a yRest directive and is never exposed as a collection endpoint. The built-in directives are:

| Key       | Purpose                                               |
| --------- | ----------------------------------------------------- |
| `_data`   | Group all collections under a single block (optional) |
| `_rel`    | Declare relationships between collections             |
| `_routes` | Define custom non-CRUD endpoints                      |
| `_schema` | Declare field types and constraints per collection    |

Unknown `_`-prefixed keys are silently ignored, which means you can safely add comments via anchor keys or use yRest in combination with tools that inject their own metadata.

### `_data`

An optional block that nests all your collections under a single key. This is useful when you want to visually separate your data from the yRest directives at the top of the file:

```yaml
_data:
  users:
    - id: 1
      name: Ana
  posts:
    - id: 1
      title: Hello World
      userId: 1

_rel:
  posts:
    userId: users

_routes:
  - method: GET
    path: /health
    response:
      status: 200
      body: { status: ok }
```

The flat form (collections at the root level) and the `_data` block form are equivalent and can even coexist in the same file — collections from both places are merged, with root-level keys taking priority on name conflicts. Most projects use the flat form for simplicity; `_data` is useful when a long file benefits from clear visual separation.

### `_rel`

Declares how collections reference each other. The shorthand form is the most common:

```yaml
_rel:
  posts:
    userId: users # posts.userId is a foreign key referencing users.id
  comments:
    postId: posts
    userId: users
```

Once declared, relations unlock `?_expand` (resolve a parent) and `?_embed` (embed children) query parameters on collection endpoints, as well as nested routes like `GET /posts/:id/comments`.

See [Relations](/database/relations/) for the full DSL and relation types.

### `_routes`

Defines static custom endpoints that don't map to any collection:

```yaml
_routes:
  - method: POST
    path: /login
    response:
      status: 200
      body:
        token: fake-jwt-abc123

  - method: GET
    path: /health
    response:
      status: 200
      body: { status: ok }
```

Custom routes are registered before collection routes and always take priority. They support template variables, conditional scenarios, per-route delays, and JavaScript handler functions.

See [Static Routes](/routes/static/) for the complete reference.

### `_schema`

Declares field-level metadata for a collection — types, required constraints, and default values:

```yaml
_schema:
  users:
    name:
      _type: string
      _required: true
    email:
      _type: string
      _required: true
    role:
      _type: string
      _default: viewer
  posts:
    title:
      _type: string
      _required: true
    published:
      _type: boolean
      _default: false
```

Schema declarations are used for validation on POST/PUT/PATCH requests and for the OpenAPI spec generated at `/_about`.

See [Field Schema](/database/schema/) for all supported types and options.

---

## The underscore convention

All yRest-internal keys in YAML must start with `_`. This separates yRest directives from user data unambiguously.

| Prefix    | Used for                                                     |
| --------- | ------------------------------------------------------------ |
| No prefix | Collection names and item fields                             |
| `_`       | Top-level directives (`_data`, `_rel`, `_routes`, `_schema`) |
| `__`      | Load-time data directives (`__uuid_gen`, `__fk`)             |

The rule is simple: if you are defining your own data, never start a key with `_`. If you see a `_`-prefixed key at the top level of `db.yml`, it is a yRest instruction.

---

## Data directives

Data directives are special string values that yRest resolves when the file is loaded. They start with `__` and appear as field values — not keys. After resolution, yRest rewrites the file with the generated values so they remain stable across restarts.

### `__uuid_gen` — generate a UUID

Replaces the field value with a randomly generated UUID v4:

```yaml
users:
  - id: __uuid_gen
    name: Ana
```

After the first run, yRest rewrites `db.yml` with the actual UUID:

```yaml
users:
  - id: a3f1c2d4-7b8e-4a9f-b0c1-2d3e4f5a6b7c
    name: Ana
```

### `__uuid_gen:alias` — generate and name a UUID

Generates a UUID and registers it under an alias so other fields can reference it via `__fk`:

```yaml
users:
  - id: __uuid_gen:ana
    name: Ana
  - id: __uuid_gen:luis
    name: Luis
```

Aliases are scoped to their collection — `__uuid_gen:ale` in `users` and `__uuid_gen:ale` in `categories` are completely independent.

### `__fk.collection:alias` — reference another item's UUID

Resolves to the UUID that was registered under `alias` in the named collection. This lets you wire up foreign keys between collections when IDs are generated at load time:

```yaml
users:
  - id: __uuid_gen:ana
    name: Ana

posts:
  - id: __uuid_gen
    title: Hello World
    userId: __fk.users:ana # → same UUID as users[alias=ana].id
```

### Full example

```yaml
users:
  - id: __uuid_gen:ana
    name: Ana
    email: ana@example.com
  - id: __uuid_gen:luis
    name: Luis
    email: luis@example.com

posts:
  - id: __uuid_gen
    title: Getting started
    userId: __fk.users:ana
  - id: __uuid_gen
    title: Advanced patterns
    userId: __fk.users:luis
```

On the first `yrest serve`, the file is rewritten with resolved UUIDs. All subsequent runs load the stable values directly — no re-generation occurs.

If a `__fk` alias cannot be found (for example, because the source `__uuid_gen:alias` is missing), yRest emits a warning in the console and leaves the field value unchanged.

---

## Starting from a template

The `init` command generates a ready-to-use `db.yml` with sample data and a `yrest.config.yml` alongside it:

```bash
npx @yrest/cli init
```

Three sample templates are available for a more detailed starting point:

```bash
npx @yrest/cli init --sample basic        # users + posts
npx @yrest/cli init --sample relational   # users + posts + comments with _rel
npx @yrest/cli init --sample ecommerce    # products + orders + users with _rel
```

---

## Live reloading

If you start the server with `--watch` (or set `watch: true` in `yrest.config.yml`), yRest monitors `db.yml` for file system changes and reloads the entire data and route tree automatically without restarting the process:

```bash
npx @yrest/cli serve db.yml --watch
```

Any collection, relation, custom route, or schema change you make in the file appears immediately in the running server. This makes it practical to iterate on your mock data in a text editor while your frontend app is running.

---

## Next steps

- [Field Schema](/database/schema/) — declare types, required constraints and defaults for your fields
- [Relations](/database/relations/) — link collections with `_rel` and unlock expand, embed and nested routes
- [Query Parameters](/database/query-params/) — filter, sort, paginate and project collection responses
