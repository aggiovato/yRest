import type { YrestStorage, Resource, RelationDef } from "../storage/types.js";

/**
 * Embeds a related parent object into a single item based on `?_expand`.
 *
 * Returns the item unchanged if `_expand` is absent or no matching relation is found.
 */
export function expandItems(
  item: Resource,
  query: Record<string, string | string[]>,
  resource: string,
  storage: YrestStorage
): Resource;

/**
 * Embeds related parent objects into each item in a collection based on `?_expand`.
 *
 * Accepts both `?_expand=author,category` (comma-separated) and
 * `?_expand=author&_expand=category` (repeated param, parsed as array by Fastify).
 *
 * Resolves relations from `_rel[resource]`. Matching rules for each expand key:
 * - `many2one` / `one2one`: FK field without `Id` suffix equals the key,
 *   or parent collection name equals the key (with or without trailing `s`).
 * - `many2many`: not supported for `?_expand` (use `?_embed` instead).
 *
 * `one2one` behaves identically to `many2one` for `?_expand` — both embed a single object.
 * Unresolvable expand keys and items missing the FK are silently ignored.
 */
export function expandItems(
  items: Resource[],
  query: Record<string, string | string[]>,
  resource: string,
  storage: YrestStorage
): Resource[];

export function expandItems(
  input: Resource | Resource[],
  query: Record<string, string | string[]>,
  resource: string,
  storage: YrestStorage
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
    for (const [field, def] of Object.entries(resourceRelations)) {
      if (def.type === "many2many") continue;
      const derivedKey = field.replace(/Id$/i, "");
      if (derivedKey === expandKey || def.target === expandKey || def.target === `${expandKey}s`) {
        expansions.set(expandKey, { field, parentCollection: def.target });
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
 * it embeds related items into the parent.
 *
 * - `many2one` / `one2one`: embeds children filtered by FK. `one2one` returns a single
 *   object instead of an array.
 * - `many2many`: joins through the declared pivot collection and returns an array of
 *   matching target items.
 */
export function embedItems(
  item: Resource,
  query: Record<string, string | string[]>,
  resource: string,
  storage: YrestStorage
): Resource;

/**
 * Embeds child collections into each item in a collection based on `?_embed`.
 *
 * Accepts both `?_embed=posts,comments` (comma-separated) and
 * `?_embed=posts&_embed=comments` (repeated param).
 */
export function embedItems(
  items: Resource[],
  query: Record<string, string | string[]>,
  resource: string,
  storage: YrestStorage
): Resource[];

export function embedItems(
  input: Resource | Resource[],
  query: Record<string, string | string[]>,
  resource: string,
  storage: YrestStorage
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

  type EmbedSpec =
    | { kind: "many2one"; childCollection: string; fkField: string }
    | { kind: "one2one"; childCollection: string; fkField: string }
    | { kind: "many2many"; target: string; through: string; foreignKey: string; otherKey: string };

  const embeds = new Map<string, EmbedSpec>();

  for (const embedKey of keys) {
    // Check for many2many declared directly on this resource
    const ownRelations = relations[resource] ?? {};
    if (embedKey in ownRelations) {
      const def = ownRelations[embedKey]!;
      if (def.type === "many2many") {
        embeds.set(embedKey, {
          kind: "many2many",
          target: def.target,
          through: def.through,
          foreignKey: def.foreignKey,
          otherKey: def.otherKey,
        });
        continue;
      }
    }

    // Scan other collections for FK pointing at this resource (many2one / one2one)
    outer: for (const [childCollection, fields] of Object.entries(relations)) {
      for (const [fkField, def] of Object.entries(fields)) {
        if (
          (def.type === "many2one" || def.type === "one2one") &&
          def.target === resource &&
          childCollection === embedKey
        ) {
          embeds.set(embedKey, { kind: def.type, childCollection, fkField });
          break outer;
        }
      }
    }
  }

  if (embeds.size === 0) return isArray ? items : input;

  const result = items.map((item) => {
    const out: Resource = { ...item };
    for (const [embedKey, spec] of embeds) {
      if (spec.kind === "many2many") {
        const pivot = storage.getCollection(spec.through) ?? [];
        const matchingIds = new Set(
          pivot
            .filter((row) => String(row[spec.foreignKey]) === String(item["id"]))
            .map((row) => String(row[spec.otherKey]))
        );
        out[embedKey] = (storage.getCollection(spec.target) ?? []).filter((t) =>
          matchingIds.has(String(t["id"]))
        );
      } else if (spec.kind === "one2one") {
        out[embedKey] =
          (storage.getCollection(spec.childCollection) ?? []).find(
            (child) => String(child[spec.fkField]) === String(item["id"])
          ) ?? null;
      } else {
        out[embedKey] = (storage.getCollection(spec.childCollection) ?? []).filter(
          (child) => String(child[spec.fkField]) === String(item["id"])
        );
      }
    }
    return out;
  });

  return isArray ? result : result[0]!;
}

/**
 * Auto-embeds related objects for all relations declared with `nested: true` in `_rel`,
 * without requiring `?_expand` or `?_embed` query params.
 *
 * - `many2one` / `one2one` with `nested: true`: resolves the FK field to the full parent object
 *   and adds it under the derived key (`userId` → `user`). The original FK field is preserved.
 * - `many2many` with `nested: true`: resolves via the pivot and embeds the target array
 *   under the alias key (e.g. `tags`).
 *
 * Called before the query-param-driven expand/embed pipeline so auto-nested fields are always
 * present regardless of the request query string.
 */
export function applyNested(item: Resource, resource: string, storage: YrestStorage): Resource;
export function applyNested(items: Resource[], resource: string, storage: YrestStorage): Resource[];
export function applyNested(
  input: Resource | Resource[],
  resource: string,
  storage: YrestStorage
): Resource | Resource[] {
  const isArray = Array.isArray(input);
  const items = isArray ? input : [input];

  const resourceRelations = storage.getRelations()[resource] ?? {};
  const nestedDefs = Object.entries(resourceRelations).filter(([, def]) => def.nested === true) as [
    string,
    RelationDef & { nested: true },
  ][];

  if (nestedDefs.length === 0) return input;

  const result = items.map((item) => {
    const out: Resource = { ...item };

    for (const [key, def] of nestedDefs) {
      if (def.type === "many2many") {
        const pivot = storage.getCollection(def.through) ?? [];
        const matchingIds = new Set(
          pivot
            .filter((row) => String(row[def.foreignKey]) === String(item["id"]))
            .map((row) => String(row[def.otherKey]))
        );
        out[key] = (storage.getCollection(def.target) ?? []).filter((t) =>
          matchingIds.has(String(t["id"]))
        );
      } else {
        // many2one or one2one: key is the FK field, embed under derived name
        const foreignKeyValue = item[key];
        if (foreignKeyValue === undefined) continue;
        const parent = (storage.getCollection(def.target) ?? []).find(
          (p) => String(p["id"]) === String(foreignKeyValue)
        );
        if (parent !== undefined) {
          const embedKey = key.replace(/Id$/i, "");
          out[embedKey] = parent;
        }
      }
    }

    return out;
  });

  return isArray ? result : result[0]!;
}
