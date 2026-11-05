import { describe, it, expect } from "vitest";
import ts from "typescript";
import { generateTypes, singularize } from "../../src/codegen/generateTypes";
import { parseSchema } from "../../src/storage/parseSchema";
import { parseRelations } from "../../src/storage/parseRelations";

/** Extracts the body of `export interface <name> { ... }` from the output. */
function iface(out: string, name: string): string {
  const match = out.match(new RegExp(`export interface ${name} \\{\\n([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`interface ${name} not found in:\n${out}`);
  return match[1]!;
}

/** Returns TS syntax diagnostics for the generated source (empty = valid). */
function syntaxErrors(source: string): string[] {
  const result = ts.transpileModule(source, { reportDiagnostics: true });
  return (result.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

describe("singularize", () => {
  it.each([
    ["users", "user"],
    ["categories", "category"],
    ["addresses", "address"],
    ["boxes", "box"],
    ["matches", "match"],
    ["status", "status"],
    ["analysis", "analysis"],
    ["class", "class"],
    ["days", "day"],
    ["data", "data"],
  ])("%s → %s", (input, expected) => {
    expect(singularize(input)).toBe(expected);
  });
});

describe("generateTypes — naming", () => {
  it("uses singular PascalCase interface names", () => {
    const out = generateTypes({
      data: { users: [{ id: 1 }], post_tags: [{ id: 1 }], "order-items": [{ id: 1 }], blogPosts: [{ id: 1 }] },
    });
    expect(out).toContain("export interface User {");
    expect(out).toContain("export interface PostTag {");
    expect(out).toContain("export interface OrderItem {");
    expect(out).toContain("export interface BlogPost {");
  });

  it("falls back to plural name on collision", () => {
    const out = generateTypes({ data: { user: [{ id: 1 }], users: [{ id: 1 }] } });
    expect(out).toContain("export interface User {");
    expect(out).toContain("export interface Users {");
  });

  it("emits CollectionName union and Collections map in YAML order", () => {
    const out = generateTypes({ data: { users: [{ id: 1 }], "order-items": [{ id: 1 }] } });
    expect(out).toContain('export type CollectionName = "users" | "order-items";');
    expect(out).toContain("  users: User[];");
    expect(out).toContain('  "order-items": OrderItem[];');
  });

  it("emits never for an empty dataset", () => {
    expect(generateTypes({ data: {} })).toContain("export type CollectionName = never;");
  });
});

describe("generateTypes — inference", () => {
  it("marks fields present on all items as required and others optional", () => {
    const out = generateTypes({
      data: { users: [{ id: 1, name: "Ana", email: "a@x" }, { id: 2, name: "Luis" }] },
    });
    const body = iface(out, "User");
    expect(body).toContain("  id: number;");
    expect(body).toContain("  name: string;");
    expect(body).toContain("  email?: string;");
  });

  it("maps primitives and builds unions across items", () => {
    const out = generateTypes({
      data: { items: [{ a: 1, b: true, c: "x", d: 1.5 }, { a: "one", b: false, c: null, d: 2 }] },
    });
    const body = iface(out, "Item");
    expect(body).toContain("  a: number | string;");
    expect(body).toContain("  b: boolean;");
    expect(body).toContain("  c: string | null;");
    expect(body).toContain("  d: number;");
  });

  it("types null-only fields as unknown", () => {
    const body = iface(generateTypes({ data: { items: [{ x: null }] } }), "Item");
    expect(body).toContain("  x: unknown;");
  });

  it("infers arrays, parenthesising union elements", () => {
    const out = generateTypes({
      data: { items: [{ tags: ["a", "b"], mixed: [1, "a"], empty: [] }] },
    });
    const body = iface(out, "Item");
    expect(body).toContain("  tags: string[];");
    expect(body).toContain("  mixed: (number | string)[];");
    expect(body).toContain("  empty: unknown[];");
  });

  it("lets a concrete array absorb an empty one", () => {
    const body = iface(generateTypes({ data: { items: [{ tags: [] }, { tags: ["a"] }] } }), "Item");
    expect(body).toContain("  tags: string[];");
  });

  it("merges nested objects across items into one inline shape", () => {
    const out = generateTypes({
      data: { users: [{ address: { city: "Madrid", zip: "28001" } }, { address: { city: "Lima" } }] },
    });
    expect(iface(out, "User")).toContain("  address: { city: string; zip?: string };");
  });

  it("merges objects inside arrays", () => {
    const body = iface(generateTypes({ data: { items: [{ meta: [{ k: "a" }, { v: 2 }] }] } }), "Item");
    expect(body).toContain("  meta: { k?: string; v?: number }[];");
  });

  it("quotes non-identifier keys", () => {
    const body = iface(generateTypes({ data: { items: [{ "unit-price": 3 }] } }), "Item");
    expect(body).toContain('  "unit-price": number;');
  });

  it("emits an index signature for an empty collection", () => {
    expect(iface(generateTypes({ data: { categories: [] } }), "Category")).toContain(
      "  [key: string]: unknown;"
    );
  });

  it("types unresolved __uuid_gen directives as string", () => {
    const body = iface(generateTypes({ data: { posts: [{ id: "__uuid_gen:a" }] } }), "Post");
    expect(body).toContain("  id: string;");
  });
});

describe("generateTypes — _schema overrides", () => {
  const schema = parseSchema({
    users: {
      email: { _required: true, _format: email(), _description: "Contact address" },
      name: "optional",
      role: { _enum: ["admin", "editor"] },
      age: { _type: "integer" },
      bio: { _type: "string" },
      nick: { _nullable: true },
      tags: { _type: "array", _items: { _type: "string" } },
      levels: { _type: "array", _items: { _enum: [1, 2] } },
      legacy: { _deprecated: true },
    },
  });
  const data = {
    users: [
      { id: 1, name: "Ana", email: "a@x", age: "28", nick: "an", tags: [], levels: [1], legacy: 1 },
      { id: 2, name: "Luis", nick: "lu", tags: [], levels: [2], legacy: 2 },
    ],
  };
  const body = iface(generateTypes({ data, schema }), "User");

  it("_required: true forces required even if missing on some items", () => {
    expect(body).toContain("  email: string;");
  });

  it('"optional" shorthand forces optional even if present on all items', () => {
    expect(body).toContain("  name?: string;");
  });

  it("_enum becomes a literal union", () => {
    expect(body).toContain('  role?: "admin" | "editor";');
  });

  it("_type overrides the inferred type (integer → number)", () => {
    expect(body).toContain("  age?: number;");
  });

  it("schema-only fields are included as optional", () => {
    expect(body).toContain("  bio?: string;");
  });

  it("_nullable adds | null", () => {
    expect(body).toContain("  nick: string | null;");
  });

  it("array _items type and enum", () => {
    expect(body).toContain("  tags: string[];");
    expect(body).toContain("  levels: (1 | 2)[];");
  });

  it("renders description and tags as JSDoc", () => {
    expect(body).toContain("   * Contact address\n   * @format email\n   */\n  email: string;");
    expect(body).toContain("   * @deprecated\n   */\n  legacy: number;");
  });

  function email() {
    return "email";
  }
});

describe("generateTypes — _rel annotations", () => {
  it("annotates many2one / one2one FK fields, including DSL @foreignKey", () => {
    const relations = parseRelations({
      posts: { userId: "users", category: "m2o:categories@categoryId", tags: "m2m:tags@post_tags(postId,tagId)" },
      profiles: { userId: { _type: "one2one", _target: "users" } },
    });
    const out = generateTypes({
      data: {
        posts: [{ id: 1, userId: 1, categoryId: 2 }],
        profiles: [{ id: 1, userId: 1 }],
      },
      relations,
    });
    const posts = iface(out, "Post");
    expect(posts).toContain("  /** FK → users.id */\n  userId: number;");
    expect(posts).toContain("  /** FK → categories.id */\n  categoryId: number;");
    expect(posts).not.toContain("tags");
    expect(iface(out, "Profile")).toContain("  /** FK → users.id */\n  userId: number;");
  });
});

describe("generateTypes — output", () => {
  it("is syntactically valid TypeScript", () => {
    const out = generateTypes(
      {
        data: {
          users: [{ id: 1, "a-b": [{ x: [1, "y"] }], n: null }],
          empty: [],
          "9lives": [{ id: 1 }],
        },
        schema: parseSchema({ users: { role: { _enum: ["a", 'q"t'] }, d: { _description: "has */ end" } } }),
      },
      { source: "db.yml" }
    );
    expect(syntaxErrors(out)).toEqual([]);
    expect(out).toMatch(/^\/\/ Auto-generated by yrest types/);
    expect(out).toContain("// Source: db.yml");
  });

  it("is deterministic", () => {
    const input = { data: { users: [{ id: 1, b: 2, a: 1 }], posts: [{ id: 1 }] } };
    expect(generateTypes(input)).toBe(generateTypes(input));
    expect(iface(generateTypes(input), "User")).toBe("  id: number;\n  b: number;\n  a: number;");
  });
});
