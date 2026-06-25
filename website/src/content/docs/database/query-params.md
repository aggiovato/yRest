---
title: Query Parameters
description: Filter, search, sort, paginate, project and embed — complete query reference
---

All `GET` endpoints accept query parameters for filtering, sorting, pagination, projection and relation embedding. Parameters can be combined freely in any order.

---

## Field filters

Return only items that match a field value:

```
GET /users?name=Ana
GET /users?role=admin&active=true
```

Comparison is case-sensitive. Numeric strings match numeric fields — `?id=1` matches `id: 1`.

**OR semantics with repeated params** — if the same field is repeated, an item passes if it matches any of the values:

```
GET /users?role=admin&role=editor    # returns admins AND editors
GET /posts?status=draft&status=review
```

---

## Field operators

Append an operator suffix to any field name to change the comparison:

| Suffix   | Type             | Description                      | Example                 |
| -------- | ---------------- | -------------------------------- | ----------------------- |
| `_gte`   | numeric / string | Greater than or equal            | `?age_gte=18`           |
| `_lte`   | numeric / string | Less than or equal               | `?price_lte=50`         |
| `_ne`    | any              | Not equal                        | `?status_ne=inactive`   |
| `_like`  | string           | Case-insensitive substring match | `?name_like=ana`        |
| `_start` | string           | Case-insensitive prefix match    | `?email_start=admin`    |
| `_regex` | string           | Case-insensitive regex match     | `?code_regex=^[A-Z]{3}` |

```bash
# age >= 18
curl "http://localhost:3070/users?age_gte=18"

# price between 10 and 100
curl "http://localhost:3070/products?price_gte=10&price_lte=100"

# name contains "ana" (case-insensitive)
curl "http://localhost:3070/users?name_like=ana"

# email starts with "admin"
curl "http://localhost:3070/users?email_start=admin"

# code matches regex
curl "http://localhost:3070/products?code_regex=^SKU-[0-9]+"
```

Operators and plain filters can be combined: `?role=admin&age_gte=30`.

---

## Full-text search

Search across all scalar fields of every item at once:

```
GET /users?_q=ana
GET /posts?_q=javascript
```

An item passes if **any** string or number field contains the search term (case-insensitive substring match). Fields with object or array values are not searched.

```bash
# matches users with "ana" anywhere in name, email, role, etc.
curl "http://localhost:3070/users?_q=ana"

# can be combined with other filters
curl "http://localhost:3070/posts?_q=typescript&status=published"
```

---

## Sorting

```
GET /users?_sort=name              # ascending (default)
GET /users?_sort=name&_order=desc  # descending
GET /products?_sort=price&_order=asc
```

| Param    | Values          | Description                     |
| -------- | --------------- | ------------------------------- |
| `_sort`  | any field name  | Field to sort by                |
| `_order` | `asc` \| `desc` | Sort direction (default: `asc`) |

String fields are compared case-insensitively. Items missing the sort field are pushed to the end of the list.

---

## Pagination

### Default mode

Without `--pageable`, use `_page` and `_limit` to slice the results. The total item count is returned in the `X-Total-Count` response header:

```bash
# Page 1, 10 items per page
curl "http://localhost:3070/users?_page=1&_limit=10"
# → X-Total-Count: 47

# First 5 items (no page, just a limit)
curl "http://localhost:3070/users?_limit=5"
```

| Param    | Description              |
| -------- | ------------------------ |
| `_page`  | Page number (1-based)    |
| `_limit` | Number of items per page |

The response body is still the plain array — the pagination metadata is only in the header.

### Pageable mode

Start the server with `--pageable` to wrap every collection response in a `{ data, pagination }` envelope:

```bash
npx @yrest/cli serve db.yml --pageable        # default limit: 10
npx @yrest/cli serve db.yml --pageable 20     # custom default limit: 20
```

```json
{
  "data": [
    { "id": 1, "name": "Ana" },
    { "id": 2, "name": "Luis" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 23,
    "totalPages": 3,
    "isFirst": true,
    "isLast": false,
    "hasNext": true,
    "hasPrev": false
  }
}
```

The `?_page` and `?_limit` query params still work in pageable mode to navigate to a specific page. You can also set `pageable` in `yrest.config.yml` instead of passing the flag every time.

See [Server Modes](/reference/server-modes/) for the full pageable mode reference.

---

## Field projection

Return only the fields you need from each item:

```
GET /users?_fields=id,name
GET /posts?_fields=id,title,userId
```

Works on both collection responses and single-item endpoints:

```bash
# Slim down a large payload
curl "http://localhost:3070/users?_fields=id,name,email"

# Single item projection
curl "http://localhost:3070/users/1?_fields=id,name"
```

Fields not listed in `_fields` are excluded from the response. The `id` field is always included even if not listed.

---

## Embed parent (`_expand`)

Resolve a foreign key and embed the parent object directly in the response. Requires `_rel` to be declared for the collection — see [Relations](/database/relations/).

```
GET /posts?_expand=user           # embed user object in each post
GET /posts/1?_expand=user         # embed in a single post
```

Both syntaxes are equivalent:

```
?_expand=author,category          # comma-separated
?_expand=author&_expand=category  # repeated param
```

Example response:

```json
{
  "id": 1,
  "title": "First post",
  "userId": 1,
  "user": { "id": 1, "name": "Ana", "email": "ana@test.com" }
}
```

The embed key is derived from the FK field name: `userId` → `user`. Unresolvable keys are silently ignored. Works on all HTTP methods that return data.

---

## Embed children (`_embed`)

Embed related child items directly into a parent resource. Requires `_rel` to be declared — see [Relations](/database/relations/).

```
GET /users/1?_embed=posts         # embed all posts where userId === 1
GET /users?_embed=posts           # embed posts in every user
```

Both syntaxes are equivalent:

```
?_embed=posts,comments            # comma-separated
?_embed=posts&_embed=comments     # repeated param
```

Example response:

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

For `one2one` relations, the embedded value is an object instead of an array.

---

## Combined example

All parameters can be combined in a single request:

```bash
curl "http://localhost:3070/posts?userId=1&_sort=title&_order=asc&_page=1&_limit=5&_expand=user&_fields=id,title,user"
```

Returns the first 5 posts by user 1, sorted alphabetically by title, with the `user` object embedded, returning only `id`, `title` and `user` fields.

---

## Next steps

- [Relations](/database/relations/) — declare `_rel` to enable `_expand`, `_embed` and nested routes
- [YAML Format](/database/format/) — collections, reserved keys and data directives
- [Configuration](/getting-started/configuration/) — set `pageable`, `readonly` and other defaults in `yrest.config.yml`
