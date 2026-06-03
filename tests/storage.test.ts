import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYamlStorage } from "../src/storage/yamlStorage";

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

describe("createYamlStorage", () => {
  let filePath: string;

  beforeEach(() => {
    filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    writeFileSync(filePath, SAMPLE_YAML, "utf8");
  });

  afterEach(() => {
    if (existsSync(filePath)) unlinkSync(filePath);
  });

  it("reads collections from YAML file", () => {
    const storage = createYamlStorage(filePath);
    expect(Object.keys(storage.getData())).toEqual(["users", "posts"]);
  });

  it("getCollection returns correct items", () => {
    const storage = createYamlStorage(filePath);
    const users = storage.getCollection("users");
    expect(users).toHaveLength(2);
    expect(users?.[0]).toMatchObject({ id: 1, name: "Ana" });
  });

  it("getCollection returns undefined for unknown collection", () => {
    const storage = createYamlStorage(filePath);
    expect(storage.getCollection("unknown")).toBeUndefined();
  });

  it("setCollection updates in-memory data", () => {
    const storage = createYamlStorage(filePath);
    storage.setCollection("users", [{ id: 99, name: "Updated" }]);
    expect(storage.getCollection("users")).toHaveLength(1);
    expect(storage.getCollection("users")?.[0]).toMatchObject({ id: 99, name: "Updated" });
  });

  it("persist writes changes to disk", () => {
    const storage = createYamlStorage(filePath);
    storage.setCollection("users", [{ id: 99, name: "Persisted" }]);
    storage.persist();

    const reloaded = createYamlStorage(filePath);
    expect(reloaded.getCollection("users")?.[0]).toMatchObject({ id: 99, name: "Persisted" });
  });

  it("persist does not corrupt other collections", () => {
    const storage = createYamlStorage(filePath);
    storage.setCollection("users", [{ id: 99, name: "X" }]);
    storage.persist();

    const reloaded = createYamlStorage(filePath);
    expect(reloaded.getCollection("posts")).toHaveLength(1);
  });
});
