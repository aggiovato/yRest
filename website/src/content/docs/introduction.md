---
title: Introduction
description: What is yRest and when to use it
---

**yRest** is a zero-config REST API mock server for frontend developers. It reads a `db.yml` file and automatically exposes a full CRUD REST API — including relations, query parameters, pagination, SSE streams and custom static routes — with no backend needed.

```bash
npx @yrest/cli serve db.yml
# → REST API at http://localhost:3070
```

## When to use it

- You're building a frontend and need a realistic API before the backend is ready.
- You need a predictable mock for integration tests (Vitest, Playwright, Cypress).
- You want to demo a UI flow without maintaining a real server.
- You need SSE or custom endpoint behaviour that `json-server` can't handle.

## How it compares

| Feature                                      | yRest | json-server |
| -------------------------------------------- | :---: | :---------: |
| YAML database                                |  ✅   |     ❌      |
| Zero config                                  |  ✅   |     ✅      |
| Full CRUD                                    |  ✅   |     ✅      |
| Field operators (`_gte`, `_like`, `_regex`…) |  ✅   |     ⚠️      |
| Relations: many2one, one2one, many2many      |  ✅   |     ⚠️      |
| Auto-embedding (`_nested: true`)             |  ✅   |     ❌      |
| Field projection (`_fields`)                 |  ✅   |     ❌      |
| Pageable mode (envelope response)            |  ✅   |     ❌      |
| Custom routes (`_routes`)                    |  ✅   |     ❌      |
| Template variables (`{{params.id}}`)         |  ✅   |     ❌      |
| Conditional scenarios                        |  ✅   |     ❌      |
| Handler functions                            |  ✅   |     ❌      |
| SSE stream routes (`_method: SSE`)           |  ✅   |     ❌      |
| Snapshot endpoints                           |  ✅   |     ❌      |
| OpenAPI 3.0 export                           |  ✅   |     ❌      |
| Programmatic API for test frameworks         |  ✅   |     ❌      |
| TypeScript types                             |  ✅   |     ❌      |

## Install

```bash
npm install -D @yrest/cli
```

Or run directly without installing:

```bash
npx @yrest/cli serve db.yml
```
