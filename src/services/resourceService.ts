import type { YamlStorage } from "../storage/yamlStorage.js";
import type { Resource } from "../storage/types.js";

/**
 * Returns the next available incremental integer id for a collection.
 * Finds the highest existing numeric id and returns max + 1.
 * Returns 1 if the collection is empty or no numeric ids are found.
 */
export function nextId(items: Resource[]): number {
  const ids = items
    .map((i) => i["id"])
    .filter((id): id is number => typeof id === "number");
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

/**
 * Finds and returns the first item in a collection whose id matches the given string.
 * Comparison is done by converting each item's id to string.
 * Returns undefined if no match is found.
 */
export function findById(items: Resource[], id: string): Resource | undefined {
  return items.find((i) => String(i["id"]) === id);
}

/**
 * Returns the index of the first item in a collection whose id matches the given string.
 * Comparison is done by converting each item's id to string.
 * Returns -1 if no match is found.
 */
export function findIndexById(items: Resource[], id: string): number {
  return items.findIndex((i) => String(i["id"]) === id);
}

/**
 * Adds a new item to a collection and persists the change to the YAML file.
 * If the body includes an id it is respected; otherwise a new incremental id is assigned.
 * The id is always placed as the first field of the created item.
 */
export function createItem(
  storage: YamlStorage,
  resource: string,
  body: Resource
): Resource {
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
 * Fully replaces an existing item in a collection and persists the change.
 * The original id is always preserved regardless of what the body contains.
 * Returns the replaced item, or undefined if no item with the given id exists.
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
 * Partially updates an existing item by merging only the provided fields and persists the change.
 * Fields not included in the body are left unchanged.
 * Returns the updated item, or undefined if no item with the given id exists.
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
 * Filters a collection by query params. Params starting with _ are reserved and ignored.
 * Comparison converts each item field to string, so ?id=1 matches numeric id: 1.
 * Returns the original array unchanged if no filterable params are present.
 */
export function filterByQuery(
  items: Resource[],
  query: Record<string, string>
): Resource[] {
  const filters = Object.entries(query).filter(([key]) => !key.startsWith("_"));
  if (filters.length === 0) return items;
  return items.filter((item) =>
    filters.every(([key, value]) => item[key] !== undefined && String(item[key]) === value)
  );
}

/**
 * Returns a page of items from a (already filtered) collection.
 * page and limit must be positive integers; no clamping is done here.
 */
export function paginate(items: Resource[], page: number, limit: number): Resource[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

/**
 * Removes an item from a collection and persists the change.
 * Returns the deleted item so the caller can confirm what was removed,
 * or undefined if no item with the given id exists.
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
