import { resolve } from "node:path";
import type { Data, Relations, CustomRoute, YrestStorage } from "../storage/types.js";
import type { YrestOptions } from "../config/loadOptions.js";
import { loadHandlers } from "../utils/handlers.js";
import { deepCopyData } from "../utils/deepCopy.js";
import { createYrestServerFromStorage } from "../server/index.js";
import type { YrestServer } from "../server/index.js";
export type { YrestServer };

// ─── Public types ────────────────────────────────────────────────────────────

/** Base options shared between file-based and data-based server instances. */
export type YrestServerBaseOptions = {
  /** TCP port to listen on. Defaults to `3070`. Use `0` to get a random available port. */
  port?: number;
  /** Host to bind. Defaults to `"localhost"`. */
  host?: string;
  /** URL prefix prepended to every route (e.g. `"/api"`). */
  base?: string;
  /** Reject all mutating requests (POST, PUT, PATCH, DELETE) with `405`. */
  readonly?: boolean;
  /** Milliseconds to delay every response. */
  delay?: number;
  /** Wrap GET collection responses in `{ data, pagination }`. Pass `true` (limit 10) or a number. */
  pageable?: boolean | number;
  /** Save a snapshot at startup and expose `/_snapshot` endpoints. */
  snapshot?: boolean;
  /** Path to a JS file exporting handler functions for custom `_routes` entries. */
  handlers?: string;
};

/**
 * Options for {@link createYrestServer}.
 * Either `file` (path to a `db.yml`) or `data` (inline object, e.g. from `yrest\`...\``) is required.
 */
export type YrestServerOptions = YrestServerBaseOptions &
  ({ file: string; data?: never } | { data: Data; file?: never });

// ─── Public factory ───────────────────────────────────────────────────────────

/**
 * Creates a yRest server instance for programmatic use.
 *
 * Accepts either a `file` path to a `db.yml` or an inline `data` object
 * (typically produced by the {@link yrest} tagged template literal).
 *
 * The server is not started until you call `start()`.
 *
 * @example — file-based (e.g. in Playwright globalSetup)
 * ```ts
 * const server = createYrestServer({ file: "./tests/db.yml", readonly: true });
 * await server.start();
 * // → http://localhost:3070
 * await server.stop();
 * ```
 *
 * @example — inline data (e.g. in Vitest)
 * ```ts
 * import { createYrestServer, yrest } from "@yrest/cli";
 *
 * const server = createYrestServer({
 *   data: yrest`
 *     users:
 *       - id: 1
 *         name: Ana
 *   `,
 *   port: 0,
 *   readonly: true,
 * });
 *
 * beforeAll(() => server.start());
 * afterAll(() => server.stop());
 * ```
 */
export function createYrestServer(options: YrestServerOptions): YrestServer {
  const resolvedOptions = buildOptions(options);
  let _inner: YrestServer | null = null;

  return {
    async start() {
      const storage =
        "data" in options && options.data !== undefined
          ? createInMemoryStorage(options.data)
          : (await import("../storage/yrestStorage.js")).createYrestStorage(resolvedOptions.file);

      const handlers = resolvedOptions.handlers
        ? await loadHandlers(resolve(resolvedOptions.handlers))
        : new Map();

      _inner = createYrestServerFromStorage(storage, resolvedOptions, handlers);
      await _inner.start();
    },

    async stop() {
      await _inner?.stop();
    },

    get port() {
      return _inner?.port ?? 0;
    },

    get url() {
      return _inner?.url ?? "";
    },
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildOptions(opts: YrestServerOptions): YrestOptions {
  const pageable = opts.pageable;
  return {
    file: "file" in opts && opts.file ? opts.file : "",
    port: opts.port ?? 3070,
    host: opts.host ?? "localhost",
    base: opts.base ? (opts.base.startsWith("/") ? opts.base : `/${opts.base}`) : "",
    watch: false,
    snapshot: opts.snapshot ?? false,
    readonly: opts.readonly ?? false,
    delay: opts.delay ?? 0,
    handlers: opts.handlers,
    pageable:
      typeof pageable === "number"
        ? { enabled: true, limit: pageable }
        : pageable
          ? { enabled: true, limit: 10 }
          : { enabled: false, limit: 10 },
  };
}

function createInMemoryStorage(data: Data): YrestStorage {
  const raw = data as Record<string, unknown>;

  const relations: Relations = (raw["_rel"] as Relations) ?? {};
  const routes: CustomRoute[] = Array.isArray(raw["_routes"])
    ? (raw["_routes"] as CustomRoute[])
    : [];
  const collections: Data = Object.fromEntries(
    Object.entries(raw).filter(([k]) => k !== "_rel" && k !== "_routes")
  ) as Data;

  let snapshot = {
    data: deepCopyData(collections),
    relations: { ...relations },
    savedAt: new Date(),
  };

  return {
    getData: () => collections,
    getRelations: () => relations,
    getRoutes: () => routes,
    getCollection: (name) => collections[name],
    setCollection: (name, items) => {
      collections[name] = items;
    },
    persist: () => {
      /* no-op: in-memory storage does not write to disk */
    },
    reload: () => {
      /* no-op: in-memory storage has no file to reload */
    },
    getSnapshot: () => snapshot,
    saveSnapshot: () => {
      snapshot = {
        data: deepCopyData(collections),
        relations: { ...relations },
        savedAt: new Date(),
      };
    },
    resetToSnapshot: () => {
      const snap = deepCopyData(snapshot.data);
      for (const key of Object.keys(collections)) delete collections[key];
      Object.assign(collections, snap);
    },
  };
}
