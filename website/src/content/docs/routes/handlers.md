---
title: Handler Functions
description: Add real logic to custom routes with yrest.handlers.js — async functions, stateful mocks, typed wrappers
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

Handler functions give you full programmatic control over a route response. You export async functions from a `yrest.handlers.js` file; yRest loads them at startup and calls the matching function when the route is hit. Unlike scenarios, handlers can run any logic — counters, state, conditional branching, external calls.

## The handler file

## Function signature

## Referencing a handler in \_routes

## Fallback to response:

## CLI scaffold command

## Async handlers

## TypeScript support

## Examples

## Next steps

- [Scenarios](/routes/scenarios/) — simpler conditional responses without code
- [SSE Streams](/routes/sse/) — handler-based SSE streams (Phase 12B)
- [CLI Reference](/reference/cli-reference/) — `yrest handler` command reference
