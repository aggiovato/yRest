import type { RelationDef, Relations } from "./types.js";

/**
 * Normalises a raw `_rel` block from the YAML file into canonical {@link Relations}.
 *
 * Accepts two value forms per field:
 * - `string` → `{ type: "many2one", target: string }`
 * - `object` with explicit `type` (many2one | one2one | many2many)
 *
 * Unknown or malformed entries are silently skipped.
 */
export function parseRelations(raw: unknown): Relations {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const result: Relations = {};

  for (const [collection, fields] of Object.entries(raw as Record<string, unknown>)) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;

    result[collection] = {};

    for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
      const def = normaliseRelationDef(key, value);
      if (def) result[collection]![key] = def;
    }
  }

  return result;
}

function normaliseRelationDef(key: string, value: unknown): RelationDef | null {
  if (typeof value === "string") {
    return { type: "many2one", target: value };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const v = value as Record<string, unknown>;
  const type = v["_type"];

  const nested = v["_nested"] === true ? true : undefined;

  if (type === "many2one" || type === undefined) {
    const target = v["_target"];
    if (typeof target !== "string") return null;
    return nested ? { type: "many2one", target, nested } : { type: "many2one", target };
  }

  if (type === "one2one") {
    const target = v["_target"];
    if (typeof target !== "string") return null;
    return nested ? { type: "one2one", target, nested } : { type: "one2one", target };
  }

  if (type === "many2many") {
    const target = typeof v["_target"] === "string" ? v["_target"] : key;
    const through = v["_through"];
    const foreignKey = v["_foreignKey"];
    const otherKey = v["_otherKey"];
    if (
      typeof through !== "string" ||
      typeof foreignKey !== "string" ||
      typeof otherKey !== "string"
    )
      return null;
    return nested
      ? { type: "many2many", target, through, foreignKey, otherKey, nested }
      : { type: "many2many", target, through, foreignKey, otherKey };
  }

  return null;
}
