/**
 * Unit tests for parseSchema() — all _schema DSL keys (Phase 11A)
 *
 * Covers:
 *   Shorthand forms:  "required" | "optional"
 *   Core:             _required, _type, _format, _enum, _description, _default, _example, _nullable
 *   String:           _minLength, _maxLength, _pattern
 *   Number/integer:   _minimum, _maximum, _exclusiveMinimum, _exclusiveMaximum, _multipleOf
 *   Array:            _minItems, _maxItems, _uniqueItems, _items (_type, _format, _enum)
 *   OpenAPI meta:     _deprecated, _readOnly, _writeOnly
 *   Guards:           invalid values are silently skipped
 */
import { describe, it, expect } from "vitest";
import { parseSchema } from "../../src/storage/parseSchema";

// ── Helpers ───────────────────────────────────────────────────────────────────

function field(value: unknown) {
  return parseSchema({ users: { name: value } })["users"]?.["name"];
}

// ── Shorthand forms ───────────────────────────────────────────────────────────

describe("shorthand forms", () => {
  it('"required" → { required: true }', () => {
    expect(field("required")).toEqual({ required: true });
  });

  it('"optional" → { required: false }', () => {
    expect(field("optional")).toEqual({ required: false });
  });
});

// ── Core properties ───────────────────────────────────────────────────────────

describe("core properties", () => {
  it("_required: true sets required", () => {
    expect(field({ _required: true })).toMatchObject({ required: true });
  });

  it("_required: false sets required", () => {
    expect(field({ _required: false })).toMatchObject({ required: false });
  });

  it.each(["string", "integer", "number", "boolean", "object", "array"] as const)(
    "_type: %s is accepted",
    (t) => {
      expect(field({ _type: t })).toMatchObject({ type: t });
    }
  );

  it("unknown _type is ignored", () => {
    expect(field({ _type: "uuid" })).not.toHaveProperty("type");
  });

  it("_format sets format", () => {
    expect(field({ _format: "email" })).toMatchObject({ format: "email" });
  });

  it("_enum sets enum array", () => {
    expect(field({ _enum: ["a", "b", "c"] })).toMatchObject({ enum: ["a", "b", "c"] });
  });

  it("_enum with non-array is ignored", () => {
    expect(field({ _enum: "a" })).not.toHaveProperty("enum");
  });

  it("_description sets description", () => {
    expect(field({ _description: "The user name" })).toMatchObject({
      description: "The user name",
    });
  });

  it("_default sets default value (string)", () => {
    expect(field({ _default: "anonymous" })).toMatchObject({ default: "anonymous" });
  });

  it("_default sets default value (number)", () => {
    expect(field({ _default: 0 })).toMatchObject({ default: 0 });
  });

  it("_default sets default value (boolean false)", () => {
    expect(field({ _default: false })).toMatchObject({ default: false });
  });

  it("_example sets example", () => {
    expect(field({ _example: "Ana" })).toMatchObject({ example: "Ana" });
  });

  it("_nullable: true sets nullable", () => {
    expect(field({ _nullable: true })).toMatchObject({ nullable: true });
  });

  it("_nullable: false sets nullable", () => {
    expect(field({ _nullable: false })).toMatchObject({ nullable: false });
  });
});

// ── String constraints ────────────────────────────────────────────────────────

describe("string constraints", () => {
  it("_minLength sets minLength", () => {
    expect(field({ _minLength: 3 })).toMatchObject({ minLength: 3 });
  });

  it("_maxLength sets maxLength", () => {
    expect(field({ _maxLength: 50 })).toMatchObject({ maxLength: 50 });
  });

  it("_pattern sets pattern", () => {
    expect(field({ _pattern: "^[a-z]+$" })).toMatchObject({ pattern: "^[a-z]+$" });
  });

  it("_minLength as string is ignored", () => {
    expect(field({ _minLength: "3" })).not.toHaveProperty("minLength");
  });

  it("_maxLength as string is ignored", () => {
    expect(field({ _maxLength: "50" })).not.toHaveProperty("maxLength");
  });
});

// ── Number / integer constraints ──────────────────────────────────────────────

describe("number / integer constraints", () => {
  it("_minimum sets minimum", () => {
    expect(field({ _minimum: 0 })).toMatchObject({ minimum: 0 });
  });

  it("_maximum sets maximum", () => {
    expect(field({ _maximum: 100 })).toMatchObject({ maximum: 100 });
  });

  it("_exclusiveMinimum sets exclusiveMinimum", () => {
    expect(field({ _exclusiveMinimum: 0 })).toMatchObject({ exclusiveMinimum: 0 });
  });

  it("_exclusiveMaximum sets exclusiveMaximum", () => {
    expect(field({ _exclusiveMaximum: 100 })).toMatchObject({ exclusiveMaximum: 100 });
  });

  it("_multipleOf sets multipleOf", () => {
    expect(field({ _multipleOf: 5 })).toMatchObject({ multipleOf: 5 });
  });

  it("_minimum as string is ignored", () => {
    expect(field({ _minimum: "0" })).not.toHaveProperty("minimum");
  });

  it("_maximum as string is ignored", () => {
    expect(field({ _maximum: "100" })).not.toHaveProperty("maximum");
  });
});

// ── Array constraints ─────────────────────────────────────────────────────────

describe("array constraints", () => {
  it("_minItems sets minItems", () => {
    expect(field({ _minItems: 1 })).toMatchObject({ minItems: 1 });
  });

  it("_maxItems sets maxItems", () => {
    expect(field({ _maxItems: 10 })).toMatchObject({ maxItems: 10 });
  });

  it("_uniqueItems: true sets uniqueItems", () => {
    expect(field({ _uniqueItems: true })).toMatchObject({ uniqueItems: true });
  });

  it("_uniqueItems: false sets uniqueItems", () => {
    expect(field({ _uniqueItems: false })).toMatchObject({ uniqueItems: false });
  });

  it("_items with _type sets items.type", () => {
    expect(field({ _items: { _type: "string" } })).toMatchObject({ items: { type: "string" } });
  });

  it("_items with _format sets items.format", () => {
    expect(field({ _items: { _type: "string", _format: "uuid" } })).toMatchObject({
      items: { type: "string", format: "uuid" },
    });
  });

  it("_items with _enum sets items.enum", () => {
    expect(field({ _items: { _enum: ["red", "green", "blue"] } })).toMatchObject({
      items: { enum: ["red", "green", "blue"] },
    });
  });

  it("_items with invalid _type ignores the type", () => {
    const result = field({ _items: { _type: "uuid" } });
    expect(result?.items).toBeDefined();
    expect(result?.items).not.toHaveProperty("type");
  });

  it("_items as array is ignored", () => {
    expect(field({ _items: ["string"] })).not.toHaveProperty("items");
  });
});

// ── OpenAPI meta ──────────────────────────────────────────────────────────────

describe("OpenAPI meta properties", () => {
  it("_deprecated: true sets deprecated", () => {
    expect(field({ _deprecated: true })).toMatchObject({ deprecated: true });
  });

  it("_deprecated: false sets deprecated", () => {
    expect(field({ _deprecated: false })).toMatchObject({ deprecated: false });
  });

  it("_readOnly: true sets readOnly", () => {
    expect(field({ _readOnly: true })).toMatchObject({ readOnly: true });
  });

  it("_readOnly: false sets readOnly", () => {
    expect(field({ _readOnly: false })).toMatchObject({ readOnly: false });
  });

  it("_writeOnly: true sets writeOnly", () => {
    expect(field({ _writeOnly: true })).toMatchObject({ writeOnly: true });
  });

  it("_writeOnly: false sets writeOnly", () => {
    expect(field({ _writeOnly: false })).toMatchObject({ writeOnly: false });
  });
});

// ── Guards — invalid inputs silently skipped ──────────────────────────────────

describe("guards — invalid inputs", () => {
  it("null field value is skipped", () => {
    expect(field(null)).toBeUndefined();
  });

  it("number field value is skipped", () => {
    expect(field(42)).toBeUndefined();
  });

  it("array field value is skipped", () => {
    expect(field(["string"])).toBeUndefined();
  });

  it("empty object returns empty FieldDef", () => {
    expect(field({})).toEqual({});
  });

  it("non-object collection is skipped", () => {
    const result = parseSchema({ users: "not-an-object" });
    expect(result["users"]).toBeUndefined();
  });

  it("null _schema returns empty block", () => {
    expect(parseSchema(null)).toEqual({});
  });

  it("array _schema returns empty block", () => {
    expect(parseSchema([])).toEqual({});
  });

  it("unknown keys in field object are ignored", () => {
    expect(field({ _type: "string", unknownKey: "value" })).toEqual({ type: "string" });
  });
});

// ── Combined — realistic field definitions ────────────────────────────────────

describe("combined — realistic field definitions", () => {
  it("full string field definition", () => {
    expect(
      field({
        _type: "string",
        _required: true,
        _format: "email",
        _minLength: 5,
        _maxLength: 100,
        _pattern: "^.+@.+$",
        _description: "User email address",
        _example: "ana@test.com",
      })
    ).toEqual({
      type: "string",
      required: true,
      format: "email",
      minLength: 5,
      maxLength: 100,
      pattern: "^.+@.+$",
      description: "User email address",
      example: "ana@test.com",
    });
  });

  it("full integer field with range", () => {
    expect(
      field({
        _type: "integer",
        _required: false,
        _minimum: 0,
        _maximum: 150,
        _description: "User age",
        _nullable: true,
        _example: 28,
      })
    ).toEqual({
      type: "integer",
      required: false,
      minimum: 0,
      maximum: 150,
      description: "User age",
      nullable: true,
      example: 28,
    });
  });

  it("full array field with items and constraints", () => {
    expect(
      field({
        _type: "array",
        _minItems: 1,
        _maxItems: 20,
        _uniqueItems: true,
        _items: { _type: "string", _format: "uuid" },
      })
    ).toEqual({
      type: "array",
      minItems: 1,
      maxItems: 20,
      uniqueItems: true,
      items: { type: "string", format: "uuid" },
    });
  });

  it("multiple collections in one _schema block", () => {
    const result = parseSchema({
      users: {
        name: "required",
        email: { _type: "string", _format: "email", _required: true },
      },
      orders: {
        total: { _type: "number", _minimum: 0 },
        status: { _type: "string", _enum: ["pending", "paid", "cancelled"] },
      },
    });

    expect(result["users"]?.["name"]).toEqual({ required: true });
    expect(result["users"]?.["email"]).toMatchObject({
      type: "string",
      format: "email",
      required: true,
    });
    expect(result["orders"]?.["total"]).toMatchObject({ type: "number", minimum: 0 });
    expect(result["orders"]?.["status"]).toMatchObject({ enum: ["pending", "paid", "cancelled"] });
  });

  it("read-only + deprecated field", () => {
    expect(field({ _type: "string", _readOnly: true, _deprecated: true })).toEqual({
      type: "string",
      readOnly: true,
      deprecated: true,
    });
  });
});
