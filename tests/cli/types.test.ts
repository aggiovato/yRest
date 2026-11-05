import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateTypesFromFile } from "../../src/cli/commands/types";

const YAML = `
_schema:
  users:
    email:
      _required: true
_rel:
  posts:
    userId: users
users:
  - id: __uuid_gen:ana
    name: Ana
posts:
  - id: 1
    title: Hello
    userId: __fk.users:ana
`;

describe("yrest types — generateTypesFromFile", () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "yrest-types-"));
    file = join(dir, "db.yml");
    writeFileSync(file, YAML, "utf8");
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("generates interfaces using data, _schema and _rel", () => {
    const out = generateTypesFromFile(file);
    expect(out).toContain("// Source: db.yml");
    expect(out).toContain("export interface User {");
    expect(out).toContain("  id: string;");
    // schema-only field without _type and without data → required but untyped
    expect(out).toContain("  email: unknown;");
    expect(out).toContain("  /** FK → users.id */\n  userId: string;");
    expect(out).toContain('export type CollectionName = "users" | "posts";');
  });

  it("does not resolve __ directives nor rewrite the source file", () => {
    generateTypesFromFile(file);
    expect(readFileSync(file, "utf8")).toBe(YAML);
  });

  it("handles an empty file", () => {
    writeFileSync(file, "", "utf8");
    expect(generateTypesFromFile(file)).toContain("export type CollectionName = never;");
  });

  it("throws on invalid YAML", () => {
    writeFileSync(file, "users: [\n", "utf8");
    expect(() => generateTypesFromFile(file)).toThrow();
  });
});
