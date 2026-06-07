import type { YamlStorage } from "../storage/yamlStorage.js";
import type { Resource } from "../storage/types.js";

/**
 * Returns the next available incremental integer id for a collection.
 *
 * Finds the highest existing numeric id and returns `max + 1`.
 * Returns `1` if the collection is empty or contains no numeric ids.
 *
 * @param items - Current items in the collection.
 * @returns Next available integer id.
 */
export function nextId(items: Resource[]): number {
  const ids = items.map((i) => i["id"]).filter((id): id is number => typeof id === "number");
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

/**
 * Returns the first item whose `id` matches the given string.
 *
 * Comparison is done by converting each item's `id` to string,
 * so `"1"` matches a numeric `id: 1`.
 *
 * @param items - Collection to search.
 * @param id    - Id to look up, as a string.
 * @returns The matched item, or `undefined` if not found.
 */
export function findById(items: Resource[], id: string): Resource | undefined {
  return items.find((i) => String(i["id"]) === id);
}

/**
 * Returns the index of the first item whose `id` matches the given string.
 *
 * Comparison is done by converting each item's `id` to string,
 * so `"1"` matches a numeric `id: 1`.
 *
 * @param items - Collection to search.
 * @param id    - Id to look up, as a string.
 * @returns Zero-based index of the matched item, or `-1` if not found.
 */
export function findIndexById(items: Resource[], id: string): number {
  return items.findIndex((i) => String(i["id"]) === id);
}

/**
 * Adds a new item to a collection and persists the change to disk.
 *
 * If the body includes an `id` it is used as-is; otherwise a new incremental
 * integer id is assigned. The `id` field is always placed first in the created item.
 *
 * @param storage  - Storage instance to read from and write to.
 * @param resource - Collection name.
 * @param body     - Fields for the new item.
 * @returns The created item including its assigned id.
 */
export function createItem(storage: YamlStorage, resource: string, body: Resource): Resource {
  const collection = storage.getCollection(resource) ?? [];
  const item: Resource = {
    id: body["id"] !== undefined ? body["id"] : nextId(collection),
    ...body,
  };
  storage.setCollection(resource, [...collection, item]);
  storage.persist();
  return item;
}

/**
 * Fully replaces an existing item and persists the change to disk.
 *
 * The original `id` is always preserved regardless of what the body contains.
 *
 * @param storage  - Storage instance to read from and write to.
 * @param resource - Collection name.
 * @param id       - Id of the item to replace.
 * @param body     - New field values (`id` is ignored and taken from the existing item).
 * @returns The replaced item, or `undefined` if no item with the given id exists.
 */
export function replaceItem(
  storage: YamlStorage,
  resource: string,
  id: string,
  body: Resource
): Resource | undefined {
  const collection = storage.getCollection(resource) ?? [];
  const idx = findIndexById(collection, id);
  if (idx === -1) return undefined;
  const updated: Resource = { ...body, id: collection[idx]!["id"] };
  collection[idx] = updated;
  storage.setCollection(resource, collection);
  storage.persist();
  return updated;
}

/**
 * Partially updates an existing item by merging the provided fields and persists the change.
 *
 * Fields not present in the body are left unchanged.
 *
 * @param storage  - Storage instance to read from and write to.
 * @param resource - Collection name.
 * @param id       - Id of the item to update.
 * @param body     - Fields to merge into the existing item.
 * @returns The updated item, or `undefined` if no item with the given id exists.
 */
export function patchItem(
  storage: YamlStorage,
  resource: string,
  id: string,
  body: Resource
): Resource | undefined {
  const collection = storage.getCollection(resource) ?? [];
  const idx = findIndexById(collection, id);
  if (idx === -1) return undefined;
  const updated: Resource = { ...collection[idx], ...body };
  collection[idx] = updated;
  storage.setCollection(resource, collection);
  storage.persist();
  return updated;
}

/**
 * Returns the first string value of a query param, handling both `string` and `string[]`.
 *
 * When the same query key appears more than once Fastify parses it as `string[]`.
 * This helper normalises both cases to a single string for single-value params
 * like `?_sort`, `?_page`, `?_limit`, and `?_order`.
 *
 * @param value - Raw query param value.
 * @returns The first string, or `undefined` if the value is absent.
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Filters a collection by query params.
 *
 * Params prefixed with `_` are reserved for pagination/sorting and are ignored here.
 * Comparison converts each item field to string, so `?id=1` matches a numeric `id: 1`.
 * Repeated params (e.g. `?role=admin&role=user`) are treated as OR — any match passes.
 *
 * @param items - Collection to filter.
 * @param query - Raw query string params from the request.
 * @returns Filtered array, or the original array if no filterable params are present.
 */
export function filterByQuery(
  items: Resource[],
  query: Record<string, string | string[]>
): Resource[] {
  const filters = Object.entries(query).filter(([key]) => !key.startsWith("_"));
  if (filters.length === 0) return items;
  return items.filter((item) =>
    filters.every(([key, value]) => {
      if (item[key] === undefined) return false;
      const itemStr = String(item[key]);
      return Array.isArray(value) ? value.includes(itemStr) : itemStr === value;
    })
  );
}

/**
 * Returns a sorted copy of the collection.
 *
 * Items missing the sort field are pushed to the end.
 * String comparison is case-insensitive; numbers are compared numerically.
 *
 * @param items - Collection to sort.
 * @param field - Field name to sort by.
 * @param order - Sort direction: `"asc"` (default) or `"desc"`.
 * @returns A new sorted array; the original is not mutated.
 */
export function sortBy(items: Resource[], field: string, order: "asc" | "desc"): Resource[] {
  const direction = order === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
    return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" }) * direction;
  });
}

/**
 * Returns a single page of items from an already-filtered collection.
 *
 * @param items - Pre-filtered (and optionally sorted) collection.
 * @param page  - 1-based page number.
 * @param limit - Maximum number of items per page.
 * @returns Slice of the collection for the requested page.
 */
export function paginate(items: Resource[], page: number, limit: number): Resource[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

/**
 * Embeds a related parent object into a single item based on `?_expand`.
 *
 * Returns the item unchanged if `_expand` is absent or no matching relation is found.
 *
 * @param item     - The item to expand.
 * @param query    - Raw query string params from the request.
 * @param resource - Name of the child collection being queried.
 * @param storage  - Live YAML storage to read parent collections from.
 * @returns The item with the parent object embedded, or the original item unchanged.
 */
export function expandItems(
  item: Resource,
  query: Record<string, string | string[]>,
  resource: string,
  storage: YamlStorage
): Resource;

/**
 * Embeds related parent objects into each item in a collection based on `?_expand`.
 *
 * Accepts both `?_expand=author,category` (comma-separated) and
 * `?_expand=author&_expand=category` (repeated param, parsed as array by Fastify).
 * Mixed forms like `?_expand=author,category&_expand=tags` also work.
 *
 * Resolves relations from `_rel[resource]`. Matching rules for each expand key:
 * - Foreign key field without `Id` suffix equals the key (`userId` → `user`).
 * - Parent collection name equals the key exactly or with `s` appended (`users`, `user`).
 *
 * Unresolvable expand keys and items missing the foreign key are silently ignored.
 * Returns the array unchanged if `_expand` is absent or no matching relation is found.
 *
 * @param items    - Collection items to expand.
 * @param query    - Raw query string params from the request.
 * @param resource - Name of the child collection being queried.
 * @param storage  - Live YAML storage to read parent collections from.
 * @returns New array with parent objects embedded; originals are not mutated.
 */
export function expandItems(
  items: Resource[],
  query: Record<string, string | string[]>,
  resource: string,
  storage: YamlStorage
): Resource[];

export function expandItems(
  input: Resource | Resource[],
  query: Record<string, string | string[]>,
  resource: string,
  storage: YamlStorage
): Resource | Resource[] {
  const isArray = Array.isArray(input);
  const items = isArray ? input : [input];

  const expandParam = query["_expand"];
  if (!expandParam) return isArray ? items : input;

  // Normalise: "a,b" → ["a","b"], ["a","b"] → ["a","b"], ["a,b","c"] → ["a","b","c"]
  const keys = (Array.isArray(expandParam) ? expandParam : [expandParam])
    .flatMap((v) => v.split(","))
    .map((k) => k.trim())
    .filter(Boolean);
  const resourceRelations = storage.getRelations()[resource] ?? {};

  const expansions = new Map<string, { field: string; parentCollection: string }>();
  for (const expandKey of keys) {
    for (const [field, parentCollection] of Object.entries(resourceRelations)) {
      const derivedKey = field.replace(/Id$/i, "");
      if (
        derivedKey === expandKey ||
        parentCollection === expandKey ||
        parentCollection === `${expandKey}s`
      ) {
        expansions.set(expandKey, { field, parentCollection });
        break;
      }
    }
  }

  if (expansions.size === 0) return isArray ? items : input;

  const expanded = items.map((item) => {
    const result: Resource = { ...item };
    for (const [expandKey, { field, parentCollection }] of expansions) {
      const foreignKeyValue = item[field];
      if (foreignKeyValue === undefined) continue;
      const parent = (storage.getCollection(parentCollection) ?? []).find(
        (p) => String(p["id"]) === String(foreignKeyValue)
      );
      if (parent !== undefined) result[expandKey] = parent;
    }
    return result;
  });

  return isArray ? expanded : expanded[0]!;
}

/**
 * Removes an item from a collection and persists the change to disk.
 *
 * @param storage  - Storage instance to read from and write to.
 * @param resource - Collection name.
 * @param id       - Id of the item to remove.
 * @returns The deleted item, or `undefined` if no item with the given id exists.
 */
export function deleteItem(
  storage: YamlStorage,
  resource: string,
  id: string
): Resource | undefined {
  const collection = storage.getCollection(resource) ?? [];
  const idx = findIndexById(collection, id);
  if (idx === -1) return undefined;
  const [deleted] = collection.splice(idx, 1);
  storage.setCollection(resource, collection);
  storage.persist();
  return deleted;
}
