import type { Resource } from "../storage/types.js";

/**
 * Returns the next available incremental integer id for a collection.
 *
 * Finds the highest existing numeric id and returns `max + 1`.
 * Returns `1` if the collection is empty or contains no numeric ids.
 *
 * @param items - Current items in the collection.
 */
export function nextId(items: Resource[]): number {
  const ids = items.map((i) => i["id"]).filter((id): id is number => typeof id === "number");
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

/**
 * Returns the first string value of a query param, handling both `string` and `string[]`.
 *
 * When the same query key appears more than once Fastify parses it as `string[]`.
 * This helper normalises both cases to a single string for single-value params
 * like `?_sort`, `?_page`, `?_limit`, and `?_order`.
 *
 * @param value - Raw query param value.
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
