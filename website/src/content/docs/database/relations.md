---
title: Relations
description: Link collections with _rel — many2one, one2one, many2many, and the compact DSL
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

The `_rel` block declares relationships between collections. yRest supports three relation types (many2one, one2one, many2many) and a compact DSL with three levels of verbosity. Declared relations unlock `?_expand`, `?_embed`, auto-embedding, and nested routes automatically.

## Relation types

## Level 1 — shorthand

## Level 2 — compact with type and cardinality

## Level 3 — compact with explicit FK

## Verbose form

## Auto-embedding with nested: true

## Nested routes

## Cardinality notation

## Reference

## Next steps

- [Query Parameters](/database/query-params/) — `?_expand` and `?_embed` query params
- [Field Schema](/database/schema/) — annotate related fields in `_schema`
