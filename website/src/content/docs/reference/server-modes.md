---
title: Server Modes
description: Watch, readonly, delay, snapshot, pageable and id-strategy — runtime behaviour flags
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

Server modes change how yRest behaves at runtime — from auto-reloading the database on file changes to rejecting all writes, simulating latency, or saving state snapshots. Modes can be combined freely.

## Watch mode

`--watch` / `watch: true`

## Readonly mode

`--readonly` / `readonly: true`

## Delay mode

`--delay <ms>` / `delay: 500`

## Snapshot mode

`--snapshot` / `snapshot: true`

Snapshot mode saves the initial state of the database at startup and exposes three meta endpoints:

| Endpoint                | Description                         |
| ----------------------- | ----------------------------------- |
| `GET /_snapshot`        | Snapshot metadata (saved timestamp) |
| `POST /_snapshot/save`  | Save current state as new snapshot  |
| `POST /_snapshot/reset` | Restore to last saved snapshot      |

## Pageable mode

`--pageable [limit]` / `pageable: true`

## Id strategy

`--id-strategy increment|uuid` / `idStrategy: uuid`

## Combining modes

## Next steps

- [Configuration](/getting-started/configuration/) — set modes permanently in `yrest.config.yml`
- [CLI Reference](/reference/cli-reference/) — full flag syntax for `yrest serve`
- [Programmatic API](/reference/programmatic-api/) — pass modes as options to `createYrestServer()`
