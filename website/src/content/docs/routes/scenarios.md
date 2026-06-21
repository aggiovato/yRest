---
title: Scenarios
description: Return different responses based on request conditions with when/otherwise
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

Scenarios let a single route return different responses depending on the incoming request. A `scenarios:` array defines the conditions; `otherwise:` is the fallback when none match. This is how you mock login flows, permission checks, and error states without writing any code.

## Basic structure

## AND conditions — when as object

## OR conditions — when as array

## Condition keys

Conditions use dot-notation to access request data:

| Key prefix  | Accesses               |
| ----------- | ---------------------- |
| `body.X`    | Request body field `X` |
| `params.X`  | Path parameter `:X`    |
| `query.X`   | Query string value `X` |
| `headers.X` | Request header `X`     |

## Operator suffixes in conditions

## The otherwise: fallback

## Per-route delay

## Template variables in scenario responses

## Examples

## Next steps

- [Template Variables](/routes/templates/) — use `{{now}}`, `{{body.X}}` in scenario responses
- [Handler Functions](/routes/handlers/) — full programmatic control when scenarios aren't enough
