import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYrestStorage } from "../../src/storage/yrestStorage";

const SAMPLE_YAML = `
users:
  - id: 1
    name: Ana
    email: ana@test.com
  - id: 2
    name: Luis
    email: luis@test.com
posts:
  - id: 1
    title: First post
    userId: 1
`;

const SAMPLE_YAML_WITH_REL = `
_rel:
  posts:
    userId: users
users:
  - id: 1
    name: Ana
posts:
  - id: 1
    title: First post
    userId: 1
`;

describe("createYrestStorage", () => {
  let filePath: string;

  beforeEach(() => {
    filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    writeFileSync(filePath, SAMPLE_YAML, "utf8");
  });

  afterEach(() => {
    if (existsSync(filePath)) unlinkSync(filePath);
  });

  it("reads collections from YAML file", () => {
    const storage = createYrestStorage(filePath);
    expect(Object.keys(storage.getData())).toEqual(["users", "posts"]);
  });

  it("getCollection returns correct items", () => {
    const storage = createYrestStorage(filePath);
    const users = storage.getCollection("users");
    expect(users).toHaveLength(2);
    expect(users?.[0]).toMatchObject({ id: 1, name: "Ana" });
  });

  it("getCollection returns undefined for unknown collection", () => {
    const storage = createYrestStorage(filePath);
    expect(storage.getCollection("unknown")).toBeUndefined();
  });

  it("setCollection updates in-memory data", () => {
    const storage = createYrestStorage(filePath);
    storage.setCollection("users", [{ id: 99, name: "Updated" }]);
    expect(storage.getCollection("users")).toHaveLength(1);
    expect(storage.getCollection("users")?.[0]).toMatchObject({ id: 99, name: "Updated" });
  });

  it("persist writes changes to disk", () => {
    const storage = createYrestStorage(filePath);
    storage.setCollection("users", [{ id: 99, name: "Persisted" }]);
    storage.persist();

    const reloaded = createYrestStorage(filePath);
    expect(reloaded.getCollection("users")?.[0]).toMatchObject({ id: 99, name: "Persisted" });
  });

  it("getData does not expose _rel as a collection", () => {
    const relFilePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    writeFileSync(relFilePath, SAMPLE_YAML_WITH_REL, "utf8");
    const storage = createYrestStorage(relFilePath);
    expect(Object.keys(storage.getData())).not.toContain("_rel");
    unlinkSync(relFilePath);
  });

  it("getRelations returns _rel content", () => {
    const relFilePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    writeFileSync(relFilePath, SAMPLE_YAML_WITH_REL, "utf8");
    const storage = createYrestStorage(relFilePath);
    expect(storage.getRelations()).toEqual({
      posts: { userId: { type: "many2one", target: "users" } },
    });
    unlinkSync(relFilePath);
  });

  it("persist does not corrupt other collections", () => {
    const storage = createYrestStorage(filePath);
    storage.setCollection("users", [{ id: 99, name: "X" }]);
    storage.persist();

    const reloaded = createYrestStorage(filePath);
    expect(reloaded.getCollection("posts")).toHaveLength(1);
  });

  describe("reload", () => {
    it("picks up new data written to disk by an external process", () => {
      const storage = createYrestStorage(filePath);
      expect(storage.getCollection("users")).toHaveLength(2);

      writeFileSync(
        filePath,
        `
users:
  - id: 1
    name: Ana
  - id: 2
    name: Luis
  - id: 3
    name: Carlos
`,
        "utf8"
      );

      storage.reload();
      expect(storage.getCollection("users")).toHaveLength(3);
      expect(storage.getCollection("users")?.[2]).toMatchObject({ id: 3, name: "Carlos" });
    });

    it("picks up a new collection added externally", () => {
      const storage = createYrestStorage(filePath);
      expect(storage.getCollection("tags")).toBeUndefined();

      writeFileSync(
        filePath,
        `
users:
  - id: 1
    name: Ana
tags:
  - id: 1
    label: news
`,
        "utf8"
      );

      storage.reload();
      expect(storage.getCollection("tags")).toHaveLength(1);
    });

    it("picks up a removed collection", () => {
      const storage = createYrestStorage(filePath);
      expect(storage.getCollection("posts")).toBeDefined();

      writeFileSync(
        filePath,
        `
users:
  - id: 1
    name: Ana
`,
        "utf8"
      );

      storage.reload();
      expect(storage.getCollection("posts")).toBeUndefined();
    });

    it("updates _rel relations on reload", () => {
      const relFilePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
      writeFileSync(relFilePath, SAMPLE_YAML_WITH_REL, "utf8");
      const storage = createYrestStorage(relFilePath);
      expect(storage.getRelations()).toEqual({
        posts: { userId: { type: "many2one", target: "users" } },
      });

      writeFileSync(
        relFilePath,
        `
users:
  - id: 1
    name: Ana
posts:
  - id: 1
    title: First
    userId: 1
`,
        "utf8"
      );

      storage.reload();
      expect(storage.getRelations()).toEqual({});
      unlinkSync(relFilePath);
    });

    it("reload picks up changes inside _data block", () => {
      const path = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
      writeFileSync(path, `\n_data:\n  users:\n    - id: 1\n      name: Ana\n`, "utf8");
      const storage = createYrestStorage(path);
      expect(storage.getCollection("users")).toHaveLength(1);

      writeFileSync(
        path,
        `\n_data:\n  users:\n    - id: 1\n      name: Ana\n    - id: 2\n      name: Luis\n`,
        "utf8"
      );
      storage.reload();
      expect(storage.getCollection("users")).toHaveLength(2);
      unlinkSync(path);
    });
  });

  describe("_data block — persist format", () => {
    it("persist preserves _data block format", () => {
      const path = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
      writeFileSync(path, `\n_data:\n  users:\n    - id: 1\n      name: Ana\n`, "utf8");
      const storage = createYrestStorage(path);
      storage.setCollection("users", [{ id: 99, name: "Updated" }]);
      storage.persist();

      expect(readFileSync(path, "utf8")).toContain("_data:");
      const reloaded = createYrestStorage(path);
      expect(reloaded.getCollection("users")?.[0]).toMatchObject({ name: "Updated" });
      unlinkSync(path);
    });

    it("persist preserves flat format when no _data block was used", () => {
      const path = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
      writeFileSync(path, SAMPLE_YAML, "utf8");
      const storage = createYrestStorage(path);
      storage.setCollection("users", [{ id: 99, name: "Updated" }]);
      storage.persist();

      expect(readFileSync(path, "utf8")).not.toContain("_data:");
      unlinkSync(path);
    });
  });
});
