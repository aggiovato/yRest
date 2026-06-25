---
title: Relations
description: Link collections with _rel — many2one, one2one, many2many, and the compact DSL
---

The `_rel` block declares relationships between collections. yRest supports three relation types — `many2one`, `one2one`, and `many2many` — and a compact DSL with three levels of verbosity. Declaring a relation automatically unlocks:

- Nested routes (`GET /users/1/posts`, `GET /posts/1/tags`)
- Embed parent with `?_expand`
- Embed children with `?_embed`
- Auto-embedding on every GET with `_nested: true`

The three declaration forms (shorthand, compact DSL, and verbose object) are fully interchangeable and can be mixed freely in the same `_rel` block.

---

## Relation types

### many2one

The child collection holds a foreign key pointing to a parent collection. This is the most common relation type and the default when using the shorthand string form:

```yaml
_rel:
  posts:
    userId: users # shorthand → many2one, FK is userId, target is users
  comments:
    postId: posts
    userId: users
```

### one2one

One child record belongs to exactly one parent, and each parent has at most one child. Use the verbose form with `_type: one2one`:

```yaml
_rel:
  profiles:
    userId:
      _type: one2one
      _target: users
```

For `one2one` relations, `?_embed=profiles` returns an object instead of an array, and `GET /users/1/profiles` also returns an object.

### many2many

Two collections are linked through a pivot (junction) table. You need a separate collection for the pivot:

```yaml
post_tags:
  - id: 1
    postId: 1
    tagId: 2
  - id: 2
    postId: 1
    tagId: 3

_rel:
  posts:
    tags:
      _type: many2many
      _target: tags
      _through: post_tags # pivot collection name
      _foreignKey: postId # FK pointing to posts in the pivot
      _otherKey: tagId # FK pointing to tags in the pivot
```

From a single `many2many` declaration, yRest auto-registers both directions:

- `GET /posts/1/tags` — forward
- `GET /tags/2/posts` — inverse (created automatically)

---

## DSL syntax

The compact DSL lets you express type, target, foreign key and cardinality in a single string. All three levels produce identical results at runtime.

### Level 1 — shorthand string

The simplest form: a plain string value is the target collection name. Implies `many2one` with default cardinality.

```yaml
_rel:
  posts:
    userId: users
  comments:
    postId: posts
```

### Level 2 — compact with type and cardinality

Format: `"<type>:<target>[<carDirect>-><carInverse>]"`

```yaml
_rel:
  payments:
    bookingId: "m2o:bookings[1..1->0..n]"
  profiles:
    userId: "o2o:users[1..1->1..1]"
  posts:
    userId: "m2o:users[1..1->0..n]"
```

**Type aliases:**

| Alias | Full name   |
| ----- | ----------- |
| `m2o` | `many2one`  |
| `o2o` | `one2one`   |
| `m2m` | `many2many` |

**Cardinality notation:** format `min..max` where min is `0` or `1` and max is `1` or `n`.

| Notation | Meaning                 |
| -------- | ----------------------- |
| `1..1`   | Exactly one (mandatory) |
| `0..1`   | Zero or one (optional)  |
| `1..n`   | One or more (mandatory) |
| `0..n`   | Zero or more (optional) |

The cardinality block `[...]` is optional — omitting it applies defaults: `1..1->1..n` for `m2o`, `1..1->1..1` for `o2o`, `0..n->0..n` for `m2m`.

### Level 3 — compact with explicit FK

Use `@foreignKey` when the YAML key is a logical alias but the actual FK column name differs:

```yaml
_rel:
  posts:
    author: "m2o:users@userId[1..1->0..n]"
    # YAML key is "author" (alias), actual FK field on posts is "userId"
```

Format: `"<type>:<target>@<foreignKey>[<carDirect>-><carInverse>]"`

### many2many compact form

```yaml
_rel:
  posts:
    tags: "m2m:tags@post_tags(postId,tagId)[0..n->0..n]"
```

Format: `"m2m:<target>@<through>(<foreignKey>,<otherKey>)[<carDirect>-><carInverse>]"`

### +nested flag

Append `+nested` to any DSL string to enable auto-embedding on every GET:

```yaml
_rel:
  payments:
    userId: "m2o:users[1..1->0..n]+nested"
  posts:
    tags: "m2m:tags@post_tags(postId,tagId)[0..n->0..n]+nested"
```

---

## Verbose form

The fully explicit form uses `_`-prefixed keys for every attribute. Useful when you want maximum clarity or need to set all options:

```yaml
_rel:
  payments:
    bookingId:
      _type: many2one
      _target: bookings
      _foreignKey: bookingId
      _primaryKey: id
      _car-direct: 1..1
      _car-inverse: 0..n
      _nested: true

  profiles:
    userId:
      _type: one2one
      _target: users
      _foreignKey: userId
      _primaryKey: id
      _car-direct: 1..1
      _car-inverse: 1..1

  posts:
    tags:
      _type: many2many
      _target: tags
      _through: post_tags
      _foreignKey: postId
      _otherKey: tagId
      _car-direct: 0..n
      _car-inverse: 0..n
      _nested: true
```

---

## Auto-embedding (`_nested: true`)

Add `_nested: true` (or the `+nested` DSL flag) to any relation to embed the related data automatically in **every** GET response — no `?_expand` or `?_embed` needed.

**Without `_nested: true`:**

```
GET /posts/1  →  { "id": 1, "title": "First post", "userId": 1 }
```

**With `_nested: true` on the `userId` relation:**

```
GET /posts/1  →  { "id": 1, "title": "First post", "userId": 1, "user": { "id": 1, "name": "Ana" } }
```

Rules:

- `many2one` / `one2one` with `_nested: true`: resolves FK → parent object under the derived key (`userId` → `user`). The original FK field is preserved.
- `many2many` with `_nested: true`: resolves via pivot → target array under the alias key.

```yaml
_rel:
  posts:
    userId:
      _type: many2one
      _target: users
      _nested: true # user object embedded in every /posts response
    tags:
      _type: many2many
      _target: tags
      _through: post_tags
      _foreignKey: postId
      _otherKey: tagId
      _nested: true # tags array embedded in every /posts response
```

```
GET /posts/1  →  { "id": 1, "title": "...", "userId": 1, "user": { ... }, "tags": [...] }
```

---

## What relations enable

### Nested routes

Declaring a `many2one` or `one2one` relation creates nested read routes automatically:

```
GET /users/1/posts           # all posts where userId === 1
GET /users/1/posts/3         # post 3, only if it belongs to user 1
GET /users/1/profiles        # one2one: returns an object, not an array
```

For `many2many`, both directions are registered from a single declaration:

```
GET /posts/1/tags            # tags linked to post 1 via pivot
GET /tags/2/posts            # posts linked to tag 2 via pivot (inverse — auto-created)
```

### Embed parent (`?_expand`)

Resolve a FK and embed the parent object inline:

```bash
curl "http://localhost:3070/posts/1?_expand=user"
```

```json
{
  "id": 1,
  "title": "First post",
  "userId": 1,
  "user": { "id": 1, "name": "Ana", "email": "ana@test.com" }
}
```

### Embed children (`?_embed`)

Pull related child items into a parent response:

```bash
curl "http://localhost:3070/users/1?_embed=posts"
```

```json
{
  "id": 1,
  "name": "Ana",
  "posts": [
    { "id": 1, "title": "First post", "userId": 1 },
    { "id": 3, "title": "Another post", "userId": 1 }
  ]
}
```

```bash
# many2many via embed
curl "http://localhost:3070/posts/1?_embed=tags"
# → { "id": 1, "title": "...", "tags": [{ "id": 2, "name": "typescript" }] }

# one2one via embed (returns object, not array)
curl "http://localhost:3070/users/1?_embed=profiles"
# → { "id": 1, "name": "Ana", "profiles": { "id": 1, "bio": "..." } }
```

---

## Next steps

- [Query Parameters](/database/query-params/) — `?_expand`, `?_embed`, filtering, sorting, pagination
- [YAML Format](/database/format/) — collections, reserved keys and underscore convention
- [Static Routes](/routes/static/) — custom non-CRUD endpoints with `_routes`
