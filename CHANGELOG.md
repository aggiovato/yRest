# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.13.0] — 2026-06-23

### Added

- **`__uuid_gen` directive — UUID generation in `db.yml`:** setting any string field to `__uuid_gen` (or `__uuid_gen:alias`) causes yRest to replace it with a randomly generated UUID v4 at load time. yRest then rewrites `db.yml` with the resolved values so IDs are stable across restarts — no manual UUID copy-paste required.

  ```yaml
  users:
    - id: __uuid_gen:ana # generates a UUID, registers alias "ana"
      name: Ana
    - id: __uuid_gen:luis # generates a UUID, registers alias "luis"
      name: Luis
  ```

- **`__fk` directive — cross-collection UUID references:** setting a field to `__fk.<collection>:<alias>` resolves it to the UUID registered under that alias in the named collection. This wires FK relationships between collections whose IDs are generated at load time.

  ```yaml
  posts:
    - id: __uuid_gen
      title: Hello World
      userId: __fk.users:ana # → same UUID as users[alias=ana].id
  ```

  Resolution runs in two passes — all `__uuid_gen` values first, then all `__fk` references — so order in the file does not matter. Unresolvable aliases emit a console warning and leave the field value unchanged.

- **`--uuid` CLI flag:** shorthand for `--id-strategy uuid` on `yrest serve`. Applies to new items created via `POST` (not to the initial data in `db.yml`).

  ```bash
  npx @yrest/cli serve db.yml --uuid
  ```

### Internal

- `src/storage/resolveDirectives.ts` — new module; two-pass resolver operating on the parsed `Data` object. Returns `true` when any directive was resolved so callers know whether to persist.
- `yrestStorage.ts` — calls `resolveDirectives(data)` after `parseData()` in both `createYrestStorage` and `reload()`. Triggers `persist()` immediately if `modified = true`.
- `relational` init template updated to demonstrate `__uuid_gen:alias` and `__fk` across all collections (users, profiles, posts, post_tags, comments).

### Tests

- `tests/storage/resolveDirectives.test.ts` — 19 unit tests: UUID generation, alias registration, FK resolution, cross-collection scope isolation, unresolvable alias warning, non-string field pass-through, nested object non-recursion.
- `tests/routes/directives.test.ts` — 6 integration tests: GET returns UUID IDs, single-item GET by generated UUID, write-back on disk after first load, FK consistency between collections, no re-write on second load of resolved file.

---

## [0.12.0] — 2026-06-21

### Added

- **SSE stream routes (`_method: SSE`):** entries in `_routes` with `_method: SSE` and an `_sse` block are registered as Server-Sent Events streams. The server pushes frames over the raw socket using Fastify's `reply.hijack()` — no new dependencies, no extra peer deps. Clients connect with a standard `GET` request and receive events in the SSE wire format (`event: …\ndata: …\n\n`).

  YAML syntax:

  ```yaml
  _routes:
    - _method: SSE
      _path: /events/orders
      _sse:
        _interval: 1500 # ms between frames (default: 1000)
        _loop: true # restart after last event (default: true)
        _repeat: 3 # stop after N full cycles (omit = infinite)
        _events:
          - _event: update
            _data: { orderId: 1, status: processing }
          - _event: done
            _data: { orderId: 1, status: delivered }
  ```

  Options:

  | Key         | Default | Description                                                                 |
  | ----------- | ------- | --------------------------------------------------------------------------- |
  | `_interval` | `1000`  | Milliseconds between frames                                                 |
  | `_loop`     | `true`  | Restart the event sequence after the last frame                             |
  | `_repeat`   | —       | Stop after N complete cycles. Omit for an infinite stream                   |
  | `_events`   | —       | Ordered list of frames. Each has `_data` (required) and `_event` (optional) |

  Template variables (`{{now}}`, `{{uuid}}`, `{{params.X}}`, `{{query.X}}`) are resolved **per frame at emit time**, so each event carries a fresh timestamp or unique ID. A keep-alive comment (`: ping`) is sent every 15 s to prevent proxy timeouts. The stream is cleaned up automatically when the client disconnects.

- **`getSseRoutes()` on `YrestStorage`:** the storage interface exposes parsed SSE routes separately from regular HTTP custom routes (`getRoutes()`). Both the file-backed and in-memory storage implementations are updated.
- **`/_about` SSE streams accordion:** SSE endpoints appear in their own accordion section with a sky-blue **SSE** badge (distinct from the green GET badge), showing interval, event count and `no·loop` / `repeat·N×` modifiers when applicable.
- **`SSE` and `WS` colours pre-registered** in `METHOD_COLOR` in `about.helpers.ts`. `WS` is registered ahead of the Phase 10B WebSocket implementation.

### Internal

- `src/storage/parseSseRoutes.ts` — new module; extracts `_method: SSE` entries from the raw `_routes` array and normalises them into `SseRoute` objects.
- `src/router/routes/sse.routes.ts` — new `SSERouteCommand`: registers one GET endpoint per SSE route, drives the frame loop with recursive `setTimeout`, and clears the keep-alive interval on disconnect.
- `src/storage/parseRoutes.ts` — skips entries where `_method` is `SSE` (case-insensitive) so they are not registered as regular HTTP routes.

### Tests

- `tests/routes/sse.test.ts` — 7 E2E tests using a real bound port (`listen({ port: 0 })`): frames emitted in order, `_loop: false` closes the stream, `_repeat: N` stops after N cycles, `{{params.X}}` and `{{now}}` resolved per frame, `Content-Type: text/event-stream` header, coexistence with collection routes, `_method: GET` entries not mistaken for SSE routes.

---

## [0.11.2] — 2026-06-20

### Added

- **`_data` block support:** collections can now be grouped under a top-level `_data:` key in `db.yml`. Both flat format and `_data` block format are equivalent; they can be mixed (root-level entries win on name conflict). The file is persisted in whichever format it was originally written (`parseData.ts`, `hasDataBlock()`)
- **Full OpenAPI 3.0 property set in `_schema`:** field annotations now support all standard OpenAPI property keys via `_`-prefixed convention — `_nullable`, `_example`, `_minLength`, `_maxLength`, `_pattern`, `_minimum`, `_maximum`, `_exclusiveMinimum`, `_exclusiveMaximum`, `_multipleOf`, `_items` (with `_type`/`_format`/`_enum`), `_minItems`, `_maxItems`, `_uniqueItems`, `_deprecated`, `_readOnly`, `_writeOnly`
- **`_body.X` / `_params.X` / `_query.X` / `_headers.X` condition prefixes:** `_when` condition keys now accept both bare form (`body.email`) and `_`-prefixed form (`_body.email`), in line with the Phase 11A reserved-word convention. Both forms are equivalent at runtime

### Internal

- **`parseData.ts`** (`src/storage/parseData.ts`): extracted `_data` block parsing from `yrestStorage.ts` into its own module, consistent with the `parseRelations` / `parseRoutes` / `parseSchema` pattern
- **`buildServeOptions()`** (`src/cli/commands/serve.ts`): extracted the three-layer option merge from the `serve` command action handler into a pure, testable function

### Tests

- Unit/integration/E2E test separation with dedicated npm scripts: `test:unit`, `test:integration`, `test:e2e`
- **E2E test suite** (`tests/e2e/serve.e2e.test.ts`): 36 tests spawning real `yrest serve` processes, covering all 6 CRUD endpoints, all major CLI flags (`--readonly`, `--delay`, `--pageable`, `--snapshot`, `--base`, `--id-strategy`), custom `_routes`, relations, query parameters and meta endpoints (`/_about`, `/_openapi`)
- **`parseData.test.ts`**: 19 unit tests for flat format, `_data` block, mixed coexistence and `hasDataBlock()` edge cases (including `null`)
- **`parseSchema.test.ts`**: 61 unit tests covering all 23 `_schema` DSL keys across all property categories
- **`conditions.test.ts`**: 22 unit tests for `findMatchingScenario` with both bare and `_`-prefixed condition keys (`_body.*`, `_params.*`, `_query.*`, `_headers.*`) and operator suffixes
- **`serve.options.test.ts`**: 19 unit tests for `buildServeOptions()` three-layer merge priority
- Test file reorganisation: root-level tests moved into logical subdirectories (`tests/config/`, `tests/cli/`, `tests/storage/`, `tests/utils/`)

---

## [0.11.1] — 2026-06-18

### Added

- **SVG crow's-foot badges via `Path2D`:** cardinality badges on the E/R diagram are now rendered from pre-computed SVG `Path2D` objects for each notation (`1..1`, `0..1`, `1..n`, `0..n`, `n`), replacing the previous hand-drawn arc + stroke approach. Each badge is a filled, resolution-independent icon correctly oriented along the edge direction
- **Dynamic node widths:** entity boxes now size themselves to fit their content — header text and field names/types are measured with the canvas text API, so long collection or field names no longer overflow or get clipped
- **Quality selector for PNG export:** a `<select>` dropdown (1×, 2×, 3×, 4×; default 3×) next to the download button lets users choose the export pixel density before downloading the E/R diagram as PNG
- **SVG cardinality assets** (`assets/svg/`): five SVG files matching each cardinality icon (`0..1.svg`, `0..n.svg`, `1..1.svg`, `1..n.svg`, `n.svg`)

### Fixed

- **Pivot cardinality on many2many edges:** edges through a junction/pivot node now read `fkCarDirect`/`fkCarInverse` and `otherCarDirect`/`otherCarInverse` from the relation data instead of defaulting to `false`/`true`, so the correct notation is shown on both sides of the pivot
- **Edge label rotation:** relation labels are now rotated to follow the edge direction (with a readability flip at ±90°) and alternate above/below the line for parallel edges, instead of being placed at a fixed perpendicular offset
- **Legend badges:** the legend strip now renders the same SVG `Path2D` icons as the diagram edges, so the legend accurately reflects the actual badge shapes

---

## [0.11.0] — 2026-06-17

### Added

- **Compact relation DSL:** `_rel` fields now accept a compact string format in addition to the existing shorthand and verbose object forms
  - `"m2o:target"` — type + target in one string
  - `"m2o:target[1..1->0..n]"` — with cardinality notation (`carDirect->carInverse`)
  - `"m2o:target@foreignKey[1..1->0..n]"` — explicit FK when the field name differs from the FK column
  - `"m2m:target@through(foreignKey,otherKey)[0..n->0..n]"` — many2many compact form
  - `+nested` suffix on any DSL string — equivalent to `_nested: true`
  - Type aliases: `m2o` / `many2one`, `o2o` / `one2one`, `m2m` / `many2many`
- **Cardinality fields on `RelationDef`:** `carDirect` and `carInverse` are now stored on every resolved relation and used by `/_about` E/R diagram to render accurate crow's-foot notation instead of inferring cardinality from relation type
- **`parseRelations()` DSL parser** (`src/storage/parseRelations.ts`): new `parseDslString()` internal function handles all three DSL levels; all forms expand to the same canonical `RelationDef` at parse time
- **`parseRoutes.ts`** (`src/storage/parseRoutes.ts`): extracted `_routes` parsing logic from `yrestStorage.ts` into its own module
- **E/R diagram canvas split** (`src/router/templates/about.diagram.canvas.ts`): the inline JavaScript canvas renderer is now in a dedicated file using the `/*js*/` comment tag for editor syntax highlighting; `about.diagram.ts` retains only TypeScript types and `generateERData()`

### Changed

- **`_` prefix convention enforced on all yrest reserved keys:** verbose relation objects now use `_type`, `_target`, `_foreignKey`, `_otherKey`, `_through`, `_nested`, `_car-direct`, `_car-inverse` (all prefixed with `_`). The previous unprefixed form (`type`, `target`, `nested`, etc.) is no longer supported
- **`yrestStorage.ts`** now serialises `_foreignKey`, `_car-direct` and `_car-inverse` back to YAML on snapshot/persist
- `init --sample ecommerce` and `init --sample relational` templates updated to use the `_` prefix convention throughout

### Breaking

- Verbose `_rel` object keys without `_` prefix (`type`, `target`, `nested`, `through`, `foreignKey`, `otherKey`) are no longer parsed. Migrate existing `db.yml` files by adding `_` to each key: `type` → `_type`, `target` → `_target`, `nested` → `_nested`, etc.

---

## [0.10.0] — 2026-06-14

### Added

- **OpenAPI 3.0.3 spec generation:** always-on `GET /_openapi` (YAML, `text/yaml`) and `GET /_openapi.json` (JSON) endpoints — regenerated on every request so they stay in sync in watch mode
- **`yrest openapi <file>` CLI command:** generate an OpenAPI spec from a `db.yml` file without starting a server
  - `--output <file>` — write to a specific file path (default: `openapi.yaml` / `openapi.json`)
  - `--format json|yaml` — output format (default: `yaml`)
  - `--stdout` — print to stdout instead of writing a file
  - `--base`, `--port`, `--host`, `--title` — tune the `servers` and `info` blocks
- **`_schema` block:** declare field-level annotations per collection for accurate OpenAPI output
  - String shorthand: `fieldName: required` — marks the field as required
  - Object form: `fieldName: { required: true, type: integer, format: email, enum: [...], description: "...", default: ... }`
  - Fields absent from `_schema` are inferred from data and treated as optional
  - `_schema` is excluded from the CRUD collections — does not appear as a REST resource
- **`buildCollectionSchema()`** (`src/openapi/inferSchema.ts`): infers OpenAPI property types from the first 10 items in a collection, then merges `_schema` overrides; declared `required: true` fields populate the `required[]` array
- **`buildCrudPaths()`** (`src/openapi/buildPaths.ts`): generates full CRUD path items (GET list + POST + GET item + PUT + PATCH + DELETE) with all supported query parameters documented
- **`buildRelationPaths()`** (`src/openapi/buildPaths.ts`): generates relation path items for `many2one` (collection + item routes), `one2one`, and bidirectional `many2many`
- **`buildCustomRoutePaths()`** (`src/openapi/buildPaths.ts`): generates path items for all `_routes` entries; extracts path params, collects all possible status codes from `scenarios`, `otherwise`, `response` and `error` blocks
- **`generateOpenApi()`** (`src/openapi/generateOpenApi.ts`): assembles the complete OpenAPI 3.0.3 document from storage state + server options

### Fixed

- **YAML anchors in OpenAPI output:** `yaml.stringify` produced YAML anchors (`&a1`, `*a1`) for shared parameter objects (`COLLECTION_QUERY_PARAMS`, `ID_PATH_PARAM`), which are rejected by OpenAPI validators; fixed by passing `aliasDuplicateObjects: false` to all `stringify()` calls in `openapi.routes.ts` and the `openapi` CLI command
- **`$ref` names truncated to a single letter:** `schemaRef()` in `buildPaths.ts` was re-singularizing an already-singular schema name (`"User"` → `"U"`, `"Post"` → `"P"`); fixed by passing the name through directly

---

## [0.9.0] — 2026-06-14

### Added

- **Explicit relation types in `_rel`:** each field can now be declared as an object with an explicit `type` instead of the legacy string shorthand
  - `many2one` — foreign key on the child pointing to a parent (same semantics as the previous string shorthand; `userId: users` still works)
  - `one2one` — one child per parent; `GET /parent/:id/child` returns a single object instead of an array
  - `many2many` — join through a pivot collection; requires `through`, `foreignKey` and `otherKey` fields
- **`nested: true` flag:** add `nested: true` to any relation to auto-embed the related data in every GET response without needing `?_expand` or `?_embed`. `many2one`/`one2one` embed the parent object under the derived key (`userId` → `user`, FK preserved); `many2many` embed the resolved target array under the alias key
- **Bidirectional many2many nested routes:** declaring a `many2many` relation now automatically registers both directions — `GET /posts/:id/tags` and `GET /tags/:id/posts` — from a single `_rel` entry
- **`parseRelations()` utility** (`src/storage/parseRelations.ts`): normalises raw `_rel` YAML to canonical `RelationDef` objects on startup; string shorthand is transparently upgraded to `{ type: "many2one", target }`. Used by both the file storage and the in-memory programmatic API
- **`ecommerce` init sample:** `yrest init --sample ecommerce` scaffolds a full e-commerce domain (products, orders, users, reviews, categories, order-items) with all relation types, six `_routes` entries (scenarios, template vars, delay, error injection)
- **Enriched `basic` and `relational` init samples:** more collections, more fields, query examples in comments, and all three relation types demonstrated in `relational`
- **`src/router/templates/about.helpers.ts`:** extracted all helper functions from `about.template.ts` into a dedicated module (`escapeHtml`, `badge`, `endpointRow`, `resourceAccordion`, `nestedRoutesAccordion`, `snapshotAccordion`, `customRoutesAccordion`, `handlersAccordion`, `examplesBlock`). `about.template.ts` is now ~200 lines vs ~555 before

### Changed

- `/_about` nested routes accordion now shows:
  - Both forward and inverse routes for each `many2many` relation (`POST /posts/:id/tags` + `GET /tags/:id/posts`)
  - Yellow `nested` badge on relations declared with `nested: true`
  - `one2one` badge in teal for one-to-one relations
  - `many2many` badge in indigo for pivot-based relations
- `Relations` type is now `Record<string, Record<string, RelationDef>>` where `RelationDef` is a discriminated union (`many2one | one2one | many2many`), each with an optional `nested?: true` flag

### Fixed

- **`/_about` crash with object-format `_rel`:** in v0.8.1, using the new `one2one` or `many2many` object syntax in `_rel` caused `TypeError: parent.endsWith is not a function` inside the nested-routes loop of `about.template.ts`, returning a 500 for every `/_about` request. Fixed by `parseRelations()` normalising all relation values before they reach the template layer

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

[0.11.0]: https://github.com/aggiovato/yRest/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/aggiovato/yRest/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/aggiovato/yRest/compare/v0.8.1...v0.9.0
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
