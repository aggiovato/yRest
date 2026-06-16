import type { FieldDef, SchemaBlock } from "./types.js";

/**
 * Normalises a raw `_schema` block from the YAML file into a canonical {@link SchemaBlock}.
 *
 * Accepts two value forms per field:
 * - `"required"` / `"optional"` → `{ required: true }` / `{ required: false }`
 * - Object with any subset of {@link FieldDef} properties.
 *
 * Unknown or malformed entries are silently skipped.
 */
export function parseSchema(raw: unknown): SchemaBlock {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const result: SchemaBlock = {};

  for (const [collection, fields] of Object.entries(raw as Record<string, unknown>)) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;

    result[collection] = {};

    for (const [field, value] of Object.entries(fields as Record<string, unknown>)) {
      const def = normaliseFieldDef(value);
      if (def) result[collection]![field] = def;
    }
  }

  return result;
}

function normaliseFieldDef(value: unknown): FieldDef | null {
  if (value === "required") return { required: true };
  if (value === "optional") return { required: false };

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const v = value as Record<string, unknown>;
  const def: FieldDef = {};

  if (v["_required"] === true || v["_required"] === false) def.required = v["_required"] as boolean;
  if (
    typeof v["_type"] === "string" &&
    ["string", "integer", "number", "boolean", "object", "array"].includes(v["_type"])
  )
    def.type = v["_type"] as FieldDef["type"];
  if (typeof v["_format"] === "string") def.format = v["_format"];
  if (Array.isArray(v["_enum"])) def.enum = v["_enum"];
  if (typeof v["_description"] === "string") def.description = v["_description"];
  if (v["_default"] !== undefined) def.default = v["_default"];

  return def;
}
