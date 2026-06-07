import type { YamlStorage } from "../storage/yamlStorage.js";
import type { Resource } from "../storage/types.js";

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
