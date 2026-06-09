import type { YamlStorage, Resource } from "../storage/types.js";

/**
 * Embeds a related parent object into a single item based on `?_expand`.
 *
 * Returns the item unchanged if `_expand` is absent or no matching relation is found.
 *
 * @param item     - The item to expand.
 * @param query    - Raw query string params from the request.
 * @param resource - Name of the child collection being queried.
 * @param storage  - Live YAML storage to read parent collections from.
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
 *
 * @param items    - Collection items to expand.
 * @param query    - Raw query string params from the request.
 * @param resource - Name of the child collection being queried.
 * @param storage  - Live YAML storage to read parent collections from.
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
 * Embeds child collections into a single item based on `?_embed`.
 *
 * The inverse of {@link expandItems}: instead of embedding the parent into the child,
 * it embeds an array of children into the parent. Requires `_rel` declarations in the
 * YAML file that reference the current resource as the parent collection.
 *
 * @param item     - The parent item to embed children into.
 * @param query    - Raw query string params from the request.
 * @param resource - Name of the parent collection being queried.
 * @param storage  - Live YAML storage to read child collections from.
 */
export function embedItems(
  item: Resource,
  query: Record<string, string | string[]>,
  resource: string,
  storage: YamlStorage
): Resource;

/**
 * Embeds child collections into each item in a collection based on `?_embed`.
 *
 * Accepts both `?_embed=posts,comments` (comma-separated) and
 * `?_embed=posts&_embed=comments` (repeated param).
 *
 * @param items    - Parent items to embed children into.
 * @param query    - Raw query string params from the request.
 * @param resource - Name of the parent collection being queried.
 * @param storage  - Live YAML storage to read child collections from.
 */
export function embedItems(
  items: Resource[],
  query: Record<string, string | string[]>,
  resource: string,
  storage: YamlStorage
): Resource[];

export function embedItems(
  input: Resource | Resource[],
  query: Record<string, string | string[]>,
  resource: string,
  storage: YamlStorage
): Resource | Resource[] {
  const isArray = Array.isArray(input);
  const items = isArray ? input : [input];

  const embedParam = query["_embed"];
  if (!embedParam) return isArray ? items : input;

  const keys = (Array.isArray(embedParam) ? embedParam : [embedParam])
    .flatMap((v) => v.split(","))
    .map((k) => k.trim())
    .filter(Boolean);

  const relations = storage.getRelations();

  // For each embed key, find the relation where this resource is the parent collection.
  const embeds = new Map<string, { childCollection: string; fkField: string }>();
  for (const embedKey of keys) {
    outer: for (const [childCollection, fields] of Object.entries(relations)) {
      for (const [fkField, parentCollection] of Object.entries(fields)) {
        if (parentCollection === resource && childCollection === embedKey) {
          embeds.set(embedKey, { childCollection, fkField });
          break outer;
        }
      }
    }
  }

  if (embeds.size === 0) return isArray ? items : input;

  const result = items.map((item) => {
    const out: Resource = { ...item };
    for (const [embedKey, { childCollection, fkField }] of embeds) {
      out[embedKey] = (storage.getCollection(childCollection) ?? []).filter(
        (child) => String(child[fkField]) === String(item["id"])
      );
    }
    return out;
  });

  return isArray ? result : result[0]!;
}
