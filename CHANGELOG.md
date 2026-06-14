# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.8.1] — 2026-06-14

### Fixed

- **XSS in `/_about`:** all user-controlled strings from YAML (route paths, handler names, resource names) are now HTML-escaped before insertion. Fixed a real injection vector: `firstCustomRoute.path` was rendered unescaped inside the examples `<pre>` block. Also fixed a double-escape bug in the custom routes accordion.
- **ReDoS via `?field_regex=`:** patterns longer than 200 chars are rejected before `RegExp` compilation; invalid patterns return `false` instead of throwing.
- **Handler path injection:** `loadHandlers()` now whitelists `.js`, `.mjs`, `.cjs` extensions and rejects any other extension before calling `import()`.

---

## [0.8.0] — 2026-06-14

### Added

- **Error injection (`error:`):** `_routes` entries can declare a fixed HTTP status code that always overrides handlers, scenarios and static responses — useful for simulating outages, payment failures or auth errors
- **`errorBody:`:** optional custom response body alongside `error:`. Defaults to `{ "error": "Forced error NNN" }` if omitted
- **`idStrategy` option:** controls how `id` is generated on POST when the body does not include one — `"increment"` (default, next integer) or `"uuid"` (random UUID v4 via `crypto.randomUUID()`)
- **`--id-strategy` CLI flag** and `idStrategy:` config file key exposing the new option
- **Socket.dev badge** in README — security audit badge for the published npm package
- **`scripts/update-version-badge.mjs`:** auto-updates the Socket badge URL in README on every `npm version` bump via the `version` lifecycle hook, so the badge always reflects the latest published version without manual edits
- **`socket.allow.filesystem`** in `package.json` — declares intentional filesystem access to suppress the Socket.dev security alert (yrest reads and writes `db.yml` by design)
- Logo assets in `assets/` — four variants: `logo-white`, `logo-color`, `logo-text`, `logo-figure`
- Full-width banner image in README header
- Logo embedded as base64 data URI in the `/_about` page — no internet or external files required; falls back to text heading if the asset is missing
- Logo in demo app header replacing the text-based logo

### Changed

- `/_about` custom routes section: new red `error·NNN` badge for routes with error injection
- `/_about` active modes: new `id·uuid` badge when `idStrategy` is not the default
- `assets/` added to `package.json` `"files"` so logo assets ship with the npm package

---

## [0.7.0] — 2026-06-14

### Added

- **Conditional scenarios (`scenarios:`):** custom routes can now declare multiple response variants evaluated in declaration order — the first matching `when:` block wins
- **`when:` as object → AND semantics:** all entries must match (dot-notation keys: `body.X`, `params.X`, `query.X`, `headers.X`)
- **`when:` as array of objects → OR of ANDs:** any group satisfying all its conditions triggers the scenario
- **`otherwise:` fallback:** explicit response when `scenarios:` are defined but none matched — takes priority over `response:`
- **Field operator suffixes in conditions:** `_ne`, `_like`, `_start`, `_regex`, `_gte`, `_lte` work on scenario condition keys, reusing the same operators as the query layer
- **Template variables in scenarios/otherwise:** `{{}}` interpolation supported in scenario and `otherwise` response bodies
- **Per-route `delay:`:** fixed delay (ms) applied to a specific `_routes` entry before any response is sent, regardless of which path resolved it (handler / scenario / otherwise / response)
- **`/_about` route badges:** custom routes section now shows scenario count (purple), `(OR)` indicator, `otherwise` label, `delay·Xms` badge (orange), and `{{…}}` template indicator
- `OPERATORS` and `applyOperator` exported from `query.service.ts` for reuse by the condition engine
- New `src/utils/conditions.ts` module: `findMatchingScenario` with dot-notation path resolver

---

## [0.6.0] — 2026-06-13

### Added

- **Phase 7 — Programmatic API:** `createYrestServer` factory to embed the mock server directly in test suites (Vitest, Playwright, Cypress) without touching the CLI
- **`yrest` tagged template literal:** define inline YAML data in TypeScript with automatic dedent and interpolation support — `const data = yrest\`users: [...]\``
- **In-memory storage:** `createYrestServer({ data })` runs fully in-memory with no `db.yml` file required; each test instance is isolated and stateless
- **`port: 0` support:** assigns a random available port at startup — no port conflicts between parallel test workers
- **`src/server/index.ts` barrel:** unified import point for `createServer` and `createYrestServerFromStorage`
- GitHub Release notes now populated from `CHANGELOG.md` instead of auto-generated commit list

### Changed

- Internal rename: `YamlStorage` → `YrestStorage`, `createYamlStorage` → `createYrestStorage`
- Internal rename: `ServerOptions` → `YrestOptions`, `serverOptionsSchema` → `yrestOptionsSchema`
- `createYrestServerFromStorage` extracted to `src/server/yrestServer.ts` as shared lifecycle core used by both CLI and programmatic API — eliminates duplicated Fastify `listen/close` logic
- Public exports in `src/index.ts` reorganised into two sections: Programmatic API and low-level building blocks

### Fixed

- `start()` called twice no longer leaks an orphaned Fastify instance — idempotent by guard
- `yrest` template now throws a descriptive `[yrest]` error when interpolating an object or array instead of silently producing invalid YAML

---

## [0.5.3] — 2026-06-13

### Changed

- Package renamed from `@aggiovato/yrest` to `@yrest/cli` (new npm org `@yrest`)
- Repository renamed from `yaml-rest` to `yRest` on GitHub
- `package.json` description rewritten to lead with "YAML-powered json-server alternative"
- Keywords expanded with `json-server-alternative`, `api-mock`, `frontend-development` and others

### Added

- `CHANGELOG.md` with full version history
- GitHub issue templates (bug report, feature request)
- GitHub PR template

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

- `yrest init` post-init hint now shows the correct `npx @yrest/cli` command

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

[0.8.1]: https://github.com/aggiovato/yRest/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/aggiovato/yRest/releases/tag/v0.8.0
[0.7.0]: https://github.com/aggiovato/yRest/releases/tag/v0.7.0
[0.6.0]: https://github.com/aggiovato/yRest/releases/tag/v0.6.0
[0.5.3]: https://github.com/aggiovato/yRest/releases/tag/v0.5.3
[0.5.2]: https://github.com/aggiovato/yRest/releases/tag/v0.5.2
[0.5.1]: https://github.com/aggiovato/yRest/releases/tag/v0.5.1
[0.5.0]: https://github.com/aggiovato/yRest/releases/tag/v0.5.0
[0.4.0]: https://github.com/aggiovato/yRest/releases/tag/v0.4.0
[0.3.0]: https://github.com/aggiovato/yRest/releases/tag/v0.3.0
[0.2.0]: https://github.com/aggiovato/yRest/releases/tag/v0.2.0
[0.1.1]: https://github.com/aggiovato/yRest/releases/tag/v0.1.1
[0.1.0]: https://github.com/aggiovato/yRest/releases/tag/v0.1.0
