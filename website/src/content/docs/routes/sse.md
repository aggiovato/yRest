---
title: SSE Streams
description: "Mock Server-Sent Events with _method: SSE — scripted event sequences, looping, template variables"
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

SSE routes open a persistent HTTP connection and push a sequence of named events to the client on a configurable interval. No extra dependencies — yRest uses Node.js native streams and Fastify's raw reply API.

## Declaring an SSE route

## The \_sse block

## Event structure

## Looping and repeat

## Interval

## Template variables per frame

## Keep-alive

## Wire format

## Examples

## Next steps

- [Template Variables](/routes/templates/) — `{{now}}` and `{{uuid}}` are especially useful in SSE data
- [Handler Functions](/routes/handlers/) — handler-based SSE for fully dynamic streams (Phase 12B)
- [WebSocket](/routes/websocket/) — bidirectional mock channels (coming soon)
