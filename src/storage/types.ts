/** A single REST resource item. Field names and value types are user-defined in the YAML file. */
export type Resource = Record<string, unknown>;

/**
 * The full in-memory database.
 * Keys are collection names (e.g. `"users"`); values are arrays of {@link Resource} items.
 */
export type Data = Record<string, Resource[]>;

/**
 * Relational mappings declared under `_rel` in the YAML file.
 *
 * - Outer key: child collection name.
 * - Inner key: foreign key field on the child.
 * - Inner value: parent collection name.
 *
 * @example
 * // Given: _rel: { posts: { userId: users } }
 * // GET /users/1/posts → returns posts where userId === "1"
 */
export type Relations = Record<string, Record<string, string>>;

/**
 * A single custom route declared under `_routes` in the YAML file.
 *
 * Custom routes are registered before resource routes and take priority over them.
 * They always return a static, pre-defined response regardless of the request body or params.
 *
 * @example
 * // _routes:
 * //   - method: POST
 * //     path: /login
 * //     response:
 * //       status: 200
 * //       body: { token: abc123 }
 */
export type CustomRoute = {
  /** HTTP method (case-insensitive: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). */
  method: string;
  /** URL path. May include Fastify path params (e.g. `/users/:id`). Must start with `/`. */
  path: string;
  /**
   * Name of an exported function in the handlers file (`handlers:` in config).
   * When set, the function is called on every request and its return value is used as the response.
   * Takes priority over `response:`. Falls back to `response:` if the name is not found.
   */
  handler?: string;
  /** Static or template response. Used when `handler` is absent or not found in the handlers file. */
  response?: {
    /** HTTP status code. Defaults to `200` if omitted. */
    status?: number;
    /** Response body. Any YAML-serialisable value (object, array, string, number, null). */
    body?: unknown;
    /** Additional response headers to set alongside `Content-Type`. */
    headers?: Record<string, string>;
  };
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
