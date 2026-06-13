# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.2] — 2025-06-10

### Fixed

- `_routes` preserved correctly on every `persist()` and `reload()` cycle

---

## [0.5.1] — 2025-05-28

### Fixed

- `_routes` entries no longer lost after a write operation modifies `db.yml`

---

## [0.5.0] — 2025-05-15

### Added

- **Phase 4D — Handler functions:** `_routes` entries can reference exported JS functions via `handler:` field; loaded from `yrest.handlers.js` at startup
- **Phase 4B — Template variables:** interpolate `{{params.X}}`, `{{body.X}}`, `{{query.X}}`, `{{headers.X}}`, `{{now}}` and `{{uuid}}` into custom route response bodies
- `--handlers <file>` flag to specify a custom handlers file path

### Changed

- Router refactored to the Command Pattern — each route group is a `RouteCommand` class
- Custom routes (`_routes`) registered before resource routes and always take priority

---

## [0.4.0] — 2025-04-10

### Added

- Field operators: `_gte`, `_lte`, `_ne`, `_like`, `_start`, `_regex` on any query field
- Full-text search: `?_q=term` across all scalar fields (case-insensitive)
- Child embedding: `?_embed=collection` to inline related children into a parent item
- Field projection: `?_fields=id,name` on GET collection and item endpoints

---

## [0.3.0] — 2025-03-20

### Added

- Nested routes: `GET /parent/:id/child` and `GET /parent/:id/child/:childId`
- Snapshot mode (`--snapshot`): saves initial state and exposes `/_snapshot`, `/_snapshot/save`, `/_snapshot/reset`
- Global error handler for invalid request bodies and startup YAML parse failures
- Dynamic CLI version printed from `package.json` at runtime

---

## [0.2.0] — 2025-02-15

### Added

- Config file support: `yrest.config.yml` (merged with CLI flags; CLI always wins)
- `yrest init` creates `yrest.config.yml` alongside `db.yml`
- Pageable mode (`--pageable`): wraps GET collection responses in `{ data, pagination }` envelope
- Parent expansion: `?_expand=relation` embeds related parent object (requires `_rel`)
- OR filtering: repeated query params treated as OR (`?role=admin&role=editor`)
- Sorting: `?_sort=field&_order=asc|desc`
- Delay mode: `--delay <ms>` adds fixed latency to all responses
- Readonly mode: `--readonly` rejects POST/PUT/PATCH/DELETE with `405`
- Watch mode: `--watch` reloads `db.yml` automatically on file change
- API overview page: `GET /_about` — live HTML listing all endpoints, modes and curl examples

---

## [0.1.1] — 2025-01-20

### Fixed

- `yrest init` post-init hint now shows the correct `npx @aggiovato/yrest` command

### Added

- `?field=value` filtering on GET collection endpoints
- `--sample basic` and `--sample relational` templates for `yrest init`

---

## [0.1.0] — 2025-01-10

### Added

- Phase 1 MVP: full CRUD REST API from a single `db.yml` file
- CLI `serve` command with `--port`, `--host`, `--base` flags
- CLI `init` command to scaffold `db.yml` and `yrest.config.yml`
- Auto-incremental id assignment on POST
- `_rel` block for declaring foreign key relations between collections
- Atomic writes: temp-file-then-rename strategy to prevent corruption
- CORS enabled by default

[0.5.2]: https://github.com/aggiovato/yaml-rest/releases/tag/v0.5.2
[0.5.1]: https://github.com/aggiovato/yaml-rest/releases/tag/v0.5.1
[0.5.0]: https://github.com/aggiovato/yaml-rest/releases/tag/v0.5.0
[0.4.0]: https://github.com/aggiovato/yaml-rest/releases/tag/v0.4.0
[0.3.0]: https://github.com/aggiovato/yaml-rest/releases/tag/v0.3.0
[0.2.0]: https://github.com/aggiovato/yaml-rest/releases/tag/v0.2.0
[0.1.1]: https://github.com/aggiovato/yaml-rest/releases/tag/v0.1.1
[0.1.0]: https://github.com/aggiovato/yaml-rest/releases/tag/v0.1.0
