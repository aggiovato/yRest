---
title: Query Parameters
description: Filter, search, sort, paginate, project and embed — complete query reference
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

All `GET /collection` endpoints accept query parameters for filtering, sorting, pagination, projection and relation embedding. Parameters can be combined freely.

## Field filters

## Field operators

Append an operator suffix to any field name to change the comparison:

| Suffix   | Behaviour                      | Example                 |
| -------- | ------------------------------ | ----------------------- |
| `_gte`   | Greater than or equal          | `?price_gte=100`        |
| `_lte`   | Less than or equal             | `?price_lte=50`         |
| `_ne`    | Not equal                      | `?status_ne=inactive`   |
| `_like`  | Case-insensitive substring     | `?name_like=ana`        |
| `_start` | Starts with (case-insensitive) | `?email_start=admin`    |
| `_regex` | ECMAScript regex               | `?code_regex=^[A-Z]{3}` |

## OR filters

## Full-text search

## Sorting

## Pagination

## Pageable mode

## Field projection

## Relation embedding

## Next steps

- [Relations](/database/relations/) — declare `_rel` to enable `_expand` and `_embed`
- [Server Modes](/reference/server-modes/) — pageable mode as a server-level default
