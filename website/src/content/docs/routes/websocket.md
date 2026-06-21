---
title: WebSocket
description: Bidirectional mock channels with _method:WS — echo, broadcast, scripted events and push streams
sidebar:
  badge:
    text: SOON
    variant: note
---

WebSocket support is planned for **Phase 10B**. It will allow `_routes` entries to open persistent WS channels with echo, broadcast, scripted message handling, and server-initiated push streams — all without any extra dependencies beyond `@fastify/websocket`.

## Planned features

- **Echo mode** — reflect every incoming message back to the sender
- **Broadcast mode** — relay messages to all connected clients on the same path
- **Scripted events** — define `on: connect` / `on: message` handlers in YAML
- **Push streams** — server-initiated frames on an interval (like SSE over WS)
- **Handler delegation** — `handler:` key points to a function in `yrest.handlers.js`

## Planned YAML syntax

```yaml
_routes:
  - _method: WS
    _path: /ws/chat
    _ws:
      echo: true

  - _method: WS
    _path: /ws/notifications
    _ws:
      events:
        - on: connect
          send: { type: connected }
        - on: message
          when:
            message.type: ping
          send: { type: pong, ts: "{{now}}" }

  - _method: WS
    _path: /ws/feed
    _ws:
      push:
        interval: 2000
        loop: true
        frames:
          - { type: tick, ts: "{{now}}" }
```

:::note[Following the roadmap]
Track Phase 10B progress in the [GitHub repository](https://github.com/aggiovato/yRest).
:::
