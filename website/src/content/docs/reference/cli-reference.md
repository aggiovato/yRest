---
title: CLI Reference
description: Full flag reference for yrest serve, yrest init and yrest handler commands
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

All yRest functionality is accessible through the `yrest` CLI. Run `yrest --help` or `yrest <command> --help` for inline documentation.

```bash
yrest <command> [options]
```

## yrest serve

Start the mock server from a YAML file.

```bash
yrest serve db.yml [options]
yrest serve db.yml --port 4000 --watch --delay 200
```

### Flags

| Flag            | Short | Type              | Default     | Description                                         |
| --------------- | ----- | ----------------- | ----------- | --------------------------------------------------- |
| `--port`        | `-p`  | `number`          | `3070`      | Port to listen on                                   |
| `--host`        | `-h`  | `string`          | `localhost` | Host to bind                                        |
| `--base`        | `-b`  | `string`          | —           | URL prefix for all routes (e.g. `/api/v1`)          |
| `--watch`       | `-w`  | `boolean`         | `false`     | Reload database on file changes                     |
| `--readonly`    | `-r`  | `boolean`         | `false`     | Reject all write operations (POST/PUT/PATCH/DELETE) |
| `--delay`       | `-d`  | `number`          | `0`         | Add simulated latency in ms to every response       |
| `--snapshot`    | `-s`  | `boolean`         | `false`     | Enable `/_snapshot` save/reset endpoints            |
| `--pageable`    | —     | `number?`         | —           | Wrap list responses in `{ data, pagination }`       |
| `--id-strategy` | —     | `increment\|uuid` | `increment` | Strategy for auto-assigning `id` on POST            |

### Exit codes

## yrest init

Scaffold a new `db.yml` and optional `yrest.config.yml` in the current directory.

```bash
yrest init
yrest init --sample relational
yrest init --sample ecommerce
```

### Flags

| Flag       | Type                           | Description                        |
| ---------- | ------------------------------ | ---------------------------------- |
| `--sample` | `basic\|relational\|ecommerce` | Template to use (default: `basic`) |
| `--config` | `boolean`                      | Also create `yrest.config.yml`     |

## yrest handler

Scaffold a handler function stub in `yrest.handlers.js`.

```bash
yrest handler login
yrest handler login --method POST --path /login
yrest handler login --method POST --path /login --register
```

### Flags

| Flag         | Type      | Description                              |
| ------------ | --------- | ---------------------------------------- |
| `--method`   | `string`  | HTTP method hint (adds JSDoc comment)    |
| `--path`     | `string`  | Path hint (adds JSDoc comment)           |
| `--register` | `boolean` | Also add the `_routes` entry to `db.yml` |

## yrest types

Generate TypeScript interfaces from the YAML database schema.

```bash
yrest types db.yml
yrest types db.yml --output db.types.ts
yrest types db.yml --output db.types.ts --watch
```

:::note[Coming soon]
The `yrest types` command is planned for Phase 12. See the [roadmap](https://github.com/aggiovato/yRest#readme).
:::

## Next steps

- [Configuration](/getting-started/configuration/) — set serve options permanently in `yrest.config.yml`
- [Quick Start](/getting-started/quick-start/) — step-by-step guide for the `serve` command
- [Handler Functions](/routes/handlers/) — `yrest handler` command in depth
