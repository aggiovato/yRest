import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup, YAML_WITH_REL } from "./helpers";
import type { createServer } from "../../src/server/createServer";

describe("?_fields projection", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_REL));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns only the requested fields on a collection", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_fields=id,name" });
    expect(res.statusCode).toBe(200);
    const items = res.json<Record<string, unknown>[]>();
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(Object.keys(item)).toEqual(["id", "name"]);
    });
  });

  it("returns only the requested fields on a single item", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1?_fields=id,name" });
    expect(res.statusCode).toBe(200);
    const item = res.json<Record<string, unknown>>();
    expect(Object.keys(item)).toEqual(["id", "name"]);
    expect(item["email"]).toBeUndefined();
  });

  it("silently ignores fields not present in the item", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1?_fields=id,nonexistent" });
    const item = res.json<Record<string, unknown>>();
    expect(item["id"]).toBeDefined();
    expect(item["nonexistent"]).toBeUndefined();
  });

  it("returns all fields when _fields is absent", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1" });
    const item = res.json<Record<string, unknown>>();
    expect(item["id"]).toBeDefined();
    expect(item["name"]).toBeDefined();
    expect(item["email"]).toBeDefined();
  });

  it("can project embedded keys from ?_expand", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/posts/1?_expand=user&_fields=id,title,user",
    });
    const item = res.json<Record<string, unknown>>();
    expect(Object.keys(item)).toEqual(["id", "title", "user"]);
    expect(item["userId"]).toBeUndefined();
  });

  it("can project embedded keys from ?_embed", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/users/1?_embed=posts&_fields=id,posts",
    });
    const item = res.json<Record<string, unknown>>();
    expect(Object.keys(item)).toEqual(["id", "posts"]);
    expect(Array.isArray(item["posts"])).toBe(true);
  });

  it("can be combined with filters and sort", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/users?_sort=name&_fields=id,name",
    });
    const items = res.json<{ id: number; name: string }[]>();
    expect(items.every((u) => Object.keys(u).length === 2)).toBe(true);
    expect(items[0]!.name <= items[1]!.name).toBe(true);
  });
});
