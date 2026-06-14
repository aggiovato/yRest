import type { Resource } from "../storage/types.js";
import type { FieldDef } from "../storage/types.js";
import type { SchemaObject } from "./types.js";

/**
 * Builds an OpenAPI `SchemaObject` for a collection by combining:
 * 1. Types inferred from the first N data items (fallback).
 * 2. Explicit `_schema` field declarations (take priority over inference).
 *
 * All fields are optional unless explicitly declared `required: true` in `_schema`.
 */
export function buildCollectionSchema(
  items: Resource[],
  fieldDefs: Record<string, FieldDef> = {}
): SchemaObject {
  const sample = items.slice(0, 10);

  // Collect every field name seen across the sample and infer its type.
  const inferredTypes = new Map<string, string>();
  for (const item of sample) {
    for (const [key, value] of Object.entries(item)) {
      if (!inferredTypes.has(key)) {
        inferredTypes.set(key, jsToOpenApiType(value));
      }
    }
  }

  // Merge all known fields (from both data and explicit schema declarations).
  const allFields = new Set([...inferredTypes.keys(), ...Object.keys(fieldDefs)]);

  const properties: Record<string, SchemaObject> = {};
  const required: string[] = [];

  for (const field of allFields) {
    const def = fieldDefs[field];
    const inferred = inferredTypes.get(field) ?? "string";

    const prop: SchemaObject = {
      type: def?.type ?? inferred,
    };

    if (def?.format) prop.format = def.format;
    if (def?.description) prop.description = def.description;
    if (def?.enum) prop.enum = def.enum;
    if (def?.default !== undefined) prop.default = def.default;

    properties[field] = prop;

    if (def?.required === true) required.push(field);
  }

  const schema: SchemaObject = { type: "object", properties };
  if (required.length > 0) schema.required = required;

  return schema;
}

function jsToOpenApiType(value: unknown): string {
  if (value === null || value === undefined) return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return "string";
}
