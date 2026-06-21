---
title: Quick Start
description: Get a mock REST API running in under a minute
---

## 1. Create your database file

```bash
npx @yrest/cli init
```

This creates a `db.yml` with sample data and a `yrest.config.yml` template. Or write your own:

```yaml
# db.yml
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

## 2. Start the server

```bash
npx @yrest/cli serve db.yml
```

```
yrest  ·  http://localhost:3070

Collections (base: /):
  CRUD  /users
  CRUD  /posts

Meta:
  GET  /_about
```

## 3. Use the API

```bash
# List all users
curl http://localhost:3070/users

# Get a single user
curl http://localhost:3070/users/1

# Filter
curl "http://localhost:3070/users?name_like=ana"

# Create
curl -X POST http://localhost:3070/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Carlos","email":"carlos@test.com"}'

# Update
curl -X PATCH http://localhost:3070/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Updated"}'

# Delete
curl -X DELETE http://localhost:3070/users/1
```

## 4. Explore the API overview

Open [`http://localhost:3070/_about`](http://localhost:3070/_about) for a live HTML page listing all generated endpoints, active modes and ready-to-run `curl` examples.

## Next steps

- [Database format](/database/format/) — learn the full YAML schema
- [Query parameters](/query-params/) — filters, sorting, pagination, projections
- [Relations](/database/relations/) — link collections with `_rel`
- [Custom routes](/routes/static/) — add non-CRUD endpoints
- [Programmatic API](/programmatic-api/) — use in Vitest and Playwright
