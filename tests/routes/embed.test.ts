import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup, YAML_WITH_REL } from "./helpers";
import type { createServer } from "../../src/server/createServer";

describe("?_embed child collections", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_REL));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("embeds child collection into a single parent item", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1?_embed=posts" });
    expect(res.statusCode).toBe(200);
    const user = res.json<{ id: number; posts: unknown[] }>();
    expect(Array.isArray(user.posts)).toBe(true);
    expect(user.posts).toHaveLength(2);
  });

  it("all embedded children belong to the parent", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1?_embed=posts" });
    const user = res.json<{ id: number; posts: { userId: number }[] }>();
    expect(user.posts.every((p) => p.userId === 1)).toBe(true);
  });

  it("embeds empty array when parent has no children", async () => {
    const res = await server.inject({ method: "GET", url: "/users/2?_embed=posts" });
    expect(res.statusCode).toBe(200);
    const user = res.json<{ posts: unknown[] }>();
    expect(Array.isArray(user.posts)).toBe(true);
    expect(user.posts).toHaveLength(0);
  });

  it("embeds children into every item in a collection", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_embed=posts" });
    expect(res.statusCode).toBe(200);
    const users = res.json<{ id: number; posts: unknown[] }[]>();
    expect(users.every((u) => Array.isArray(u.posts))).toBe(true);
  });

  it("does not embed when _embed key does not match any relation", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1?_embed=unknown" });
    expect(res.statusCode).toBe(200);
    const user = res.json<Record<string, unknown>>();
    expect(user["unknown"]).toBeUndefined();
  });

  it("_embed and _expand can be used together", async () => {
    // posts have _expand=user (child → parent) and users have _embed=posts (parent → children)
    const res = await server.inject({ method: "GET", url: "/users/1?_embed=posts" });
    const user = res.json<{ posts: { title: string }[] }>();
    expect(user.posts[0]).toHaveProperty("title");
  });
});
