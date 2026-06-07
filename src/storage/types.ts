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
