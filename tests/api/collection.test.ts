import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { parse } from "yaml";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createCollectionHandle } from "../../src/api/collection";
import { createYrestServer } from "../../src/api/yrestServer";
import { yrest } from "../../src/api/yrest";
import type { YrestStorage } from "../../src/storage/types";

interface User {
  id: number | string;
  name: string;
  role?: string;
  address?: { city: string };
}

const YAML = `
users:
  - id: 1
    name: Ana
    role: admin
    address:
      city: Madrid
  - id: 2
    name: Luis
    role: user
posts: []
`;

describe("createCollectionHandle", () => {
  let filePath: string;
  let storage: YrestStorage;

  beforeEach(() => {
    filePath = join(tmpdir(), `yrest-collection-${randomUUID()}.yml`);
    writeFileSync(filePath, YAML, "utf8");
    storage = createYrestStorage(filePath);
  });

  afterEach(() => unlinkSync(filePath));

  it("findAll returns every item", () => {
    const users = createCollectionHandle<User>(storage, "users");
    expect(users.findAll().map((u) => u.name)).toEqual(["Ana", "Luis"]);
    expect(users.count()).toBe(2);
  });

  it("findById matches numeric and string ids", () => {
    const users = createCollectionHandle<User>(storage, "users");
    expect(users.findById(1)?.name).toBe("Ana");
    expect(users.findById("2")?.name).toBe("Luis");
    expect(users.findById(99)).toBeUndefined();
  });

  it("findWhere filters with a predicate", () => {
    const users = createCollectionHandle<User>(storage, "users");
    expect(users.findWhere((u) => u.role === "admin").map((u) => u.id)).toEqual([1]);
  });

  it("returns copies — mutating a result does not change the stored data", () => {
    const users = createCollectionHandle<User>(storage, "users");
    const ana = users.findById(1)!;
    ana.name = "Changed";
    ana.address!.city = "Changed";
    expect(users.findById(1)?.name).toBe("Ana");
    expect(users.findById(1)?.address?.city).toBe("Madrid");
  });

  it("create assigns an incremental id and persists to disk", () => {
    const users = createCollectionHandle<User>(storage, "users");
    const eva = users.create({ name: "Eva" });
    expect(eva.id).toBe(3);
    expect(users.count()).toBe(3);
    const onDisk = parse(readFileSync(filePath, "utf8")) as { users: User[] };
    expect(onDisk.users.at(-1)).toEqual({ id: 3, name: "Eva" });
  });

  it("create keeps an explicit id", () => {
    const users = createCollectionHandle<User>(storage, "users");
    expect(users.create({ id: 10, name: "Eva" }).id).toBe(10);
  });

  it("create uses the uuid strategy when asked", () => {
    const users = createCollectionHandle<User>(storage, "users", "uuid");
    expect(String(users.create({ name: "Eva" }).id)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("create works on an empty collection", () => {
    const posts = createCollectionHandle<{ id: number; title: string }>(storage, "posts");
    expect(posts.create({ title: "Hi" })).toEqual({ id: 1, title: "Hi" });
  });

  it("update merges the patch and never changes the id", () => {
    const users = createCollectionHandle<User>(storage, "users");
    const updated = users.update(1, { role: "editor", id: 50 } as Partial<User>);
    expect(updated).toMatchObject({ id: 1, name: "Ana", role: "editor" });
    expect(users.findById(50)).toBeUndefined();
    expect(users.update(99, { role: "x" })).toBeUndefined();
  });

  it("delete removes and returns the item", () => {
    const users = createCollectionHandle<User>(storage, "users");
    expect(users.delete(2)?.name).toBe("Luis");
    expect(users.count()).toBe(1);
    expect(users.delete(2)).toBeUndefined();
  });

  it("throws for an unknown collection, listing the known ones", () => {
    expect(() => createCollectionHandle(storage, "nope")).toThrow(
      /Collection "nope" does not exist \(known collections: users, posts\)/
    );
  });
});

describe("server.collection()", () => {
  it("throws before start()", () => {
    const server = createYrestServer({ data: { users: [] }, port: 0 });
    expect(() => server.collection("users")).toThrow(/only available after start\(\)/);
  });

  it("shares data with the HTTP API in both directions (inline data)", async () => {
    const server = createYrestServer({
      data: yrest`
        users:
          - id: 1
            name: Ana
      `,
      port: 0,
    });
    await server.start();
    try {
      const users = server.collection<User>("users");
      users.create({ name: "Luis" });

      const res = await fetch(`${server.url}/users`);
      expect(((await res.json()) as User[]).map((u) => u.name)).toEqual(["Ana", "Luis"]);

      await fetch(`${server.url}/users/1`, { method: "DELETE" });
      expect(users.findAll().map((u) => u.name)).toEqual(["Luis"]);
    } finally {
      await server.stop();
    }
  });

  it("works with a file-based server", async () => {
    const filePath = join(tmpdir(), `yrest-collection-${randomUUID()}.yml`);
    writeFileSync(filePath, YAML, "utf8");
    const server = createYrestServer({ file: filePath, port: 0 });
    await server.start();
    try {
      server.collection<User>("users").update(2, { name: "Luis M." });
      const res = await fetch(`${server.url}/users/2`);
      expect(((await res.json()) as User).name).toBe("Luis M.");
    } finally {
      await server.stop();
      unlinkSync(filePath);
    }
  });
});
