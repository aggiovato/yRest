/** A single REST resource item. Field names and value types are user-defined in the YAML file. */
export type Resource = Record<string, unknown>;

/**
 * Descriptor for a single field declared in the `_schema` block.
 *
 * All properties are optional — omit what you don't need. Fields not mentioned
 * in `_schema` are inferred from the collection data and treated as optional.
 *
 * In the YAML file every property uses the `_` prefix convention:
 * `_type`, `_required`, `_format`, `_enum`, `_description`, `_default`, etc.
 *
 * Shorthand: `fieldName: required` normalises to `{ required: true }`.
 *
 * @example
 * ```yaml
 * _schema:
 *   users:
 *     name:
 *       _type: string
 *       _required: true
 *       _minLength: 2
 *       _maxLength: 100
 *     email:
 *       _type: string
 *       _required: true
 *       _format: email
 *     age:
 *       _type: integer
 *       _minimum: 0
 *       _maximum: 120
 *       _nullable: true
 *     role:
 *       _type: string
 *       _enum: [admin, editor, viewer]
 *       _default: viewer
 *     tags:
 *       _type: array
 *       _items:
 *         _type: string
 *       _uniqueItems: true
 * ```
 */
export type FieldDef = {
  /** If `true`, the field is listed in the OpenAPI `required` array. */
  required?: boolean;
  /** Explicit type override. If absent, inferred from the data. */
  type?: "string" | "integer" | "number" | "boolean" | "object" | "array";
  /** OpenAPI `format` hint (e.g. `email`, `date`, `uuid`, `uri`, `date-time`, `binary`). */
  format?: string;
  /** Restricts the field to a fixed set of allowed values. */
  enum?: unknown[];
  /** Human-readable description included in the OpenAPI spec. */
  description?: string;
  /** Default value included in the OpenAPI spec. */
  default?: unknown;
  /** Example value included in the OpenAPI spec. */
  example?: unknown;
  /** If `true`, the field may be `null` in addition to its declared type. */
  nullable?: boolean;
  // ── String constraints ────────────────────────────────────────────────────
  /** Minimum string length (inclusive). Applies when `type` is `string`. */
  minLength?: number;
  /** Maximum string length (inclusive). Applies when `type` is `string`. */
  maxLength?: number;
  /** Regex pattern the string value must match. Applies when `type` is `string`. */
  pattern?: string;
  // ── Number / integer constraints ──────────────────────────────────────────
  /** Minimum numeric value (inclusive). Applies when `type` is `number` or `integer`. */
  minimum?: number;
  /** Maximum numeric value (inclusive). Applies when `type` is `number` or `integer`. */
  maximum?: number;
  /** Exclusive lower bound. Applies when `type` is `number` or `integer`. */
  exclusiveMinimum?: number;
  /** Exclusive upper bound. Applies when `type` is `number` or `integer`. */
  exclusiveMaximum?: number;
  /** Value must be a multiple of this number. */
  multipleOf?: number;
  // ── Array constraints ─────────────────────────────────────────────────────
  /** Schema descriptor for the items of an array field. */
  items?: Pick<FieldDef, "type" | "format" | "enum">;
  /** Minimum number of items in the array. */
  minItems?: number;
  /** Maximum number of items in the array. */
  maxItems?: number;
  /** If `true`, all array items must be unique. */
  uniqueItems?: boolean;
  // ── OpenAPI meta ──────────────────────────────────────────────────────────
  /** If `true`, marks the field as deprecated in the OpenAPI spec. */
  deprecated?: boolean;
  /** If `true`, the field is only returned in responses (excluded from request bodies). */
  readOnly?: boolean;
  /** If `true`, the field is only accepted in request bodies (excluded from responses). */
  writeOnly?: boolean;
};

/**
 * Field-level schema declarations for one or more collections, parsed from `_schema` in the YAML.
 *
 * - Outer key: collection name.
 * - Inner key: field name within that collection.
 * - Value: {@link FieldDef} descriptor (or the string shorthand `"required"` / `"optional"`).
 *
 * @example
 * ```yaml
 * _schema:
 *   users:
 *     name: required          # shorthand
 *     email:
 *       required: true
 *       format: email
 *     age:
 *       type: integer
 * ```
 */
export type SchemaBlock = Record<string, Record<string, FieldDef>>;

/**
 * The full in-memory database.
 * Keys are collection names (e.g. `"users"`); values are arrays of {@link Resource} items.
 */
export type Data = Record<string, Resource[]>;

/**
 * Canonical descriptor for a single relation declared under `_rel`.
 *
 * The YAML accepts two forms that both normalise to this type:
 * - **Shorthand string** — `userId: users` → `{ type: "many2one", target: "users" }`
 * - **Object** — explicit `type` plus the fields required by that type.
 *
 * ### Types
 * - `many2one` — (default) many children share one parent via a FK field.
 * - `one2one`  — one child belongs to one parent; `?_embed` returns a single object, not an array.
 * - `many2many` — join through a pivot collection; the relation key is the embed alias.
 *
 * @example
 * // _rel:
 * //   posts:
 * //     userId: users                        ← shorthand many2one
 * //     tags:
 * //       type: many2many
 * //       through: post_tags
 * //       foreignKey: postId
 * //       otherKey: tagId
 * //   users:
 * //     profileId:
 * //       type: one2one
 * //       target: profiles
 */
export type RelationDef =
  | {
      type: "many2one";
      target: string;
      foreignKey?: string;
      nested?: boolean;
      carDirect?: string;
      carInverse?: string;
    }
  | {
      type: "one2one";
      target: string;
      foreignKey?: string;
      nested?: boolean;
      carDirect?: string;
      carInverse?: string;
    }
  | {
      type: "many2many";
      target: string;
      through: string;
      foreignKey: string;
      otherKey: string;
      nested?: boolean;
      carDirect?: string;
      carInverse?: string;
    };

/**
 * Relational mappings declared under `_rel` in the YAML file, normalised to {@link RelationDef}.
 *
 * - Outer key: source collection name (child for many2one/one2one; either side for many2many).
 * - Inner key: FK field name (many2one/one2one) or embed alias (many2many).
 * - Inner value: canonical {@link RelationDef}.
 *
 * @example
 * // Given: _rel: { posts: { userId: users } }
 * // GET /users/1/posts → returns posts where userId === "1"
 */
export type Relations = Record<string, Record<string, RelationDef>>;

/**
 * A static response block shared by {@link CustomRoute} and {@link Scenario}.
 */
export type RouteResponse = {
  /** HTTP status code. Defaults to `200` if omitted. */
  status?: number;
  /** Response body. Any YAML-serialisable value (object, array, string, number, null). */
  body?: unknown;
  /** Additional response headers to set alongside `Content-Type`. */
  headers?: Record<string, string>;
};

/**
 * A conditional response variant for a custom route.
 *
 * Evaluated in declaration order — the first scenario whose `when` conditions match wins.
 * If none match, the route falls back to `otherwise:` (if defined) or `response:`.
 *
 * **`when` as an object** — all entries must match (AND):
 * ```yaml
 * when: { body.email: ana@test.com, body.password: secret }
 * ```
 *
 * **`when` as an array** — any group must match (OR of ANDs):
 * ```yaml
 * when:
 *   - { body.role: admin }
 *   - { body.role: superadmin }
 * ```
 *
 * Condition keys use dot-notation (`body.X`, `params.X`, `query.X`, `headers.X`).
 * Field operator suffixes are supported: `_ne`, `_like`, `_start`, `_regex`, `_gte`, `_lte`.
 * Response bodies support `{{}}` template variables (same as static routes).
 */
export type Scenario = {
  /**
   * Condition(s) to evaluate against the request.
   * - Object → all entries AND
   * - Array of objects → any group OR (each group is AND internally)
   */
  when: Record<string, unknown> | Record<string, unknown>[];
  /** Response to return when the conditions match. Supports `{{}}` template variables. */
  response: RouteResponse;
};

/**
 * A single custom route declared under `_routes` in the YAML file.
 *
 * Resolution priority per request:
 * 1. `handler` function (if defined and found in the handlers file)
 * 2. First matching `scenario` (evaluated in declaration order)
 * 3. `otherwise` block (explicit fallback when scenarios are defined but none matched)
 * 4. Static `response` block (final fallback)
 *
 * @example
 * // _routes:
 * //   - method: POST
 * //     path: /login
 * //     scenarios:
 * //       - when: { body.password: secret }
 * //         response: { status: 200, body: { token: real-tok } }
 * //       - when:
 * //           - { body.role: admin }
 * //           - { body.role: superadmin }
 * //         response: { status: 200, body: { token: admin-tok } }
 * //     otherwise:
 * //       status: 401
 * //       body: { error: Invalid credentials }
 */
export type CustomRoute = {
  /** HTTP method (case-insensitive: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). */
  method: string;
  /** URL path. May include Fastify path params (e.g. `/users/:id`). Must start with `/`. */
  path: string;
  /**
   * Name of an exported function in the handlers file (`handlers:` in config).
   * Takes priority over `scenarios` and `response`. Falls back to `response` if not found.
   */
  handler?: string;
  /** Conditional response variants. Evaluated in order — first match wins. */
  scenarios?: Scenario[];
  /**
   * Explicit fallback response when `scenarios` are defined but none matched.
   * Takes priority over `response` when present. Supports `{{}}` template variables.
   */
  otherwise?: RouteResponse;
  /** Static or template response. Final fallback when no handler, scenario, or otherwise applies. */
  response?: RouteResponse;
  /**
   * Per-route response delay in milliseconds. Overrides the global `--delay` option for this route.
   * Applied before any response is sent, regardless of which path resolved the response.
   */
  delay?: number;
  /**
   * Forces this route to always return the given HTTP status code as an error,
   * bypassing handlers, scenarios and the static response entirely.
   * Applied after `delay:` so slow-error scenarios still work.
   *
   * @example
   * // Always return 503
   * error: 503
   * errorBody: { message: "Service unavailable" }
   */
  error?: number;
  /** Optional body to return alongside `error:`. Defaults to `{ error: "Forced error <status>" }`. */
  errorBody?: unknown;
};

/** A single event in an SSE stream declared under `_sse._events`. */
export type SseEvent = {
  /** SSE event name emitted as `event: <name>`. Omit for unnamed events. */
  event?: string;
  /** Payload serialised as JSON in the `data:` line. Supports `{{}}` templates. */
  data: unknown;
};

/**
 * A Server-Sent Events stream route declared under `_routes` with an `_sse` block.
 *
 * @example
 * ```yaml
 * _routes:
 *   - _method: GET
 *     _path: /events/orders
 *     _sse:
 *       _interval: 1500
 *       _loop: true
 *       _repeat: 5
 *       _events:
 *         - _event: update
 *           _data: { orderId: 1, status: processing }
 * ```
 */
export type SseRoute = {
  /** URL path. May include Fastify path params (e.g. `/events/:id`). */
  path: string;
  /** Milliseconds between frames. Default: `1000`. */
  interval: number;
  /** Restart the sequence after the last event. Default: `true`. */
  loop: boolean;
  /** Stop after this many full cycles. Omit for infinite. */
  repeat?: number;
  /** Ordered list of events to emit. */
  events: SseEvent[];
};

/**
 * In-memory store backed by a YAML file.
 *
 * All reads operate on a live in-memory snapshot. Writes must be explicitly
 * flushed to disk by calling {@link persist}. Use {@link reload} to pull in
 * changes made to the file externally (e.g. in watch mode).
 */
export interface YrestStorage {
  /** Returns the full in-memory dataset (all collections). */
  getData(): Data;

  /** Returns the relational mappings declared under `_rel`. */
  getRelations(): Relations;

  /** Returns the field-level schema declarations from `_schema`, or `{}` if absent. */
  getSchema(): SchemaBlock;

  /**
   * Returns the items in a named collection, or `undefined` if it does not exist.
   *
   * @param name - Collection name as declared in the YAML file (e.g. `"users"`).
   */
  getCollection(name: string): Resource[] | undefined;

  /**
   * Replaces the items of a named collection in memory.
   * Call {@link persist} afterwards to flush the change to disk.
   *
   * @param name  - Collection name.
   * @param items - New array of items to store.
   */
  setCollection(name: string, items: Resource[]): void;

  /**
   * Atomically writes the current in-memory state to the YAML file.
   *
   * Uses a write-to-temp-then-rename strategy so a crash during the write
   * never leaves the file in a partially written state.
   *
   * @throws {Error} If the filesystem write or rename fails.
   */
  persist(): void;

  /**
   * Reloads the YAML file from disk and updates the in-memory state in place.
   *
   * Mutates the existing `data` and `relations` objects rather than replacing them,
   * so any code holding a reference to the storage instance sees the updated values
   * without needing to re-fetch.
   *
   * @throws {Error} If the file cannot be read or the YAML is malformed.
   */
  reload(): void;

  /**
   * Returns the custom routes declared under `_routes` in the YAML file.
   * Returns an empty array if no `_routes` block is present.
   */
  getRoutes(): CustomRoute[];

  /**
   * Returns the SSE stream routes declared under `_routes` (entries with an `_sse` block).
   * Returns an empty array if none are present.
   */
  getSseRoutes(): SseRoute[];

  /**
   * Returns the saved snapshot: a frozen copy of `data` and `relations` taken
   * at the last call to {@link saveSnapshot} (or at construction time).
   */
  getSnapshot(): { data: Data; relations: Relations; savedAt: Date };

  /**
   * Replaces the stored snapshot with a deep copy of the current in-memory state.
   * Future calls to {@link resetToSnapshot} will restore to this point.
   */
  saveSnapshot(): void;

  /**
   * Restores the in-memory state to the last saved snapshot and persists to disk.
   * Mutates `data` and `relations` in place so existing references stay valid.
   *
   * @throws {Error} If the filesystem write fails.
   */
  resetToSnapshot(): void;
}
