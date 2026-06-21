---
title: Static Routes
description: Define non-CRUD endpoints in _routes with static responses, custom headers and error injection
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

The `_routes` block lets you define endpoints that don't map to a collection — auth mocks, health checks, fixed payloads, error simulations, and more. Static routes are registered before collection routes and always take priority.

## Basic route definition

## Response structure

## Custom headers

## Per-route delay

## Error injection

## Examples

## Next steps

- [Template Variables](/routes/templates/) — interpolate request data into static responses
- [Scenarios](/routes/scenarios/) — return different responses based on request conditions
- [Handler Functions](/routes/handlers/) — add real logic with a JavaScript function
