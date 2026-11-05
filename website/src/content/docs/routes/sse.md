---
title: SSE Streams
description: "Mock Server-Sent Events with _method: SSE — scripted event sequences, looping, template variables and handler-driven streams"
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

## Handler-driven streams

When a stream depends on state — a chat, a job queue, notifications triggered by other requests — replace `_events` with `_handler` and let a function drive the stream:

```yaml
_routes:
  - _method: SSE
    _path: /events/chat
    _sse:
      _handler: chatStream
```

```ts
// yrest.handlers.ts
import { defineSseHandler } from "@yrest/cli";

export const chatStream = defineSseHandler((req, raw, { collection }) => {
  for (const message of collection("messages").findAll()) {
    raw.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
  }
  raw.end();
});
```

The handler receives `(req, raw, ctx)`: the request, the Node.js `ServerResponse` and the same `ctx.collection()` access as [handler functions](/routes/handlers/#reading-and-writing-collections). yRest sends the SSE headers and the keep-alive comments; the handler writes frames and calls `raw.end()` when it is done. `_interval`, `_loop`, `_repeat` and `_events` are not used.

A handler missing from the handlers file answers `501` before the stream opens. One that throws sends an `event: error` frame and the stream is closed. See [SSE handler streams](/routes/handlers/#sse-handler-streams) for a full chat example.

## Examples

## Next steps

- [Template Variables](/routes/templates/) — `{{now}}` and `{{uuid}}` are especially useful in SSE data
- [Handler Functions](/routes/handlers/) — handler-based SSE for fully dynamic streams (Phase 12B)
- [WebSocket](/routes/websocket/) — bidirectional mock channels (coming soon)
