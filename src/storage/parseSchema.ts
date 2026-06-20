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

const VALID_TYPES = new Set(["string", "integer", "number", "boolean", "object", "array"]);

function normaliseFieldDef(value: unknown): FieldDef | null {
  if (value === "required") return { required: true };
  if (value === "optional") return { required: false };

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const v = value as Record<string, unknown>;
  const def: FieldDef = {};

  // ── Core ──────────────────────────────────────────────────────────────────
  if (v["_required"] === true || v["_required"] === false) def.required = v["_required"] as boolean;
  if (typeof v["_type"] === "string" && VALID_TYPES.has(v["_type"]))
    def.type = v["_type"] as FieldDef["type"];
  if (typeof v["_format"] === "string") def.format = v["_format"];
  if (Array.isArray(v["_enum"])) def.enum = v["_enum"];
  if (typeof v["_description"] === "string") def.description = v["_description"];
  if (v["_default"] !== undefined) def.default = v["_default"];
  if (v["_example"] !== undefined) def.example = v["_example"];
  if (v["_nullable"] === true || v["_nullable"] === false) def.nullable = v["_nullable"] as boolean;

  // ── String constraints ────────────────────────────────────────────────────
  if (typeof v["_minLength"] === "number") def.minLength = v["_minLength"];
  if (typeof v["_maxLength"] === "number") def.maxLength = v["_maxLength"];
  if (typeof v["_pattern"] === "string") def.pattern = v["_pattern"];

  // ── Number / integer constraints ──────────────────────────────────────────
  if (typeof v["_minimum"] === "number") def.minimum = v["_minimum"];
  if (typeof v["_maximum"] === "number") def.maximum = v["_maximum"];
  if (typeof v["_exclusiveMinimum"] === "number") def.exclusiveMinimum = v["_exclusiveMinimum"];
  if (typeof v["_exclusiveMaximum"] === "number") def.exclusiveMaximum = v["_exclusiveMaximum"];
  if (typeof v["_multipleOf"] === "number") def.multipleOf = v["_multipleOf"];

  // ── Array constraints ─────────────────────────────────────────────────────
  if (typeof v["_minItems"] === "number") def.minItems = v["_minItems"];
  if (typeof v["_maxItems"] === "number") def.maxItems = v["_maxItems"];
  if (v["_uniqueItems"] === true || v["_uniqueItems"] === false)
    def.uniqueItems = v["_uniqueItems"] as boolean;
  if (v["_items"] && typeof v["_items"] === "object" && !Array.isArray(v["_items"])) {
    const items = v["_items"] as Record<string, unknown>;
    const itemsDef: FieldDef["items"] = {};
    if (typeof items["_type"] === "string" && VALID_TYPES.has(items["_type"]))
      itemsDef.type = items["_type"] as FieldDef["type"];
    if (typeof items["_format"] === "string") itemsDef.format = items["_format"];
    if (Array.isArray(items["_enum"])) itemsDef.enum = items["_enum"];
    def.items = itemsDef;
  }

  // ── OpenAPI meta ──────────────────────────────────────────────────────────
  if (v["_deprecated"] === true || v["_deprecated"] === false)
    def.deprecated = v["_deprecated"] as boolean;
  if (v["_readOnly"] === true || v["_readOnly"] === false) def.readOnly = v["_readOnly"] as boolean;
  if (v["_writeOnly"] === true || v["_writeOnly"] === false)
    def.writeOnly = v["_writeOnly"] as boolean;

  return def;
}
