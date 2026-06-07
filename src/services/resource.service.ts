import type { YamlStorage } from "../storage/yamlStorage.js";
import type { Resource } from "../storage/types.js";
import { nextId } from "../utils/params.js";

/**
 * Returns the first item whose `id` matches the given string.
 *
 * Comparison is done by converting each item's `id` to string,
 * so `"1"` matches a numeric `id: 1`.
 *
 * @param items - Collection to search.
 * @param id    - Id to look up, as a string.
 */
export function findById(items: Resource[], id: string): Resource | undefined {
  return items.find((i) => String(i["id"]) === id);
}

/**
 * Returns the index of the first item whose `id` matches the given string.
 *
 * @param items - Collection to search.
 * @param id    - Id to look up, as a string.
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
 * @param storage  - Storage instance to read from and write to.
 * @param resource - Collection name.
 * @param id       - Id of the item to update.
 * @param body     - Fields to merge into the existing item.
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
 * Removes an item from a collection and persists the change to disk.
 *
 * @param storage  - Storage instance to read from and write to.
 * @param resource - Collection name.
 * @param id       - Id of the item to remove.
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
