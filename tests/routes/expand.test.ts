import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup, YAML_WITH_REL } from "./helpers";
import type { createServer as CreateServer } from "../../src/server/createServer";

describe("?_expand (embed parent objects)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof CreateServer>>;

  beforeEach(async () => {
    const result = await createTestServer(YAML_WITH_REL);
    filePath = result.filePath;
    server = result.server;
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("embeds parent object into each item in a collection", async () => {
    const res = await server.inject({ method: "GET", url: "/posts?_expand=user" });
    expect(res.statusCode).toBe(200);
    const posts = res.json();
    expect(posts[0]).toHaveProperty("user");
    expect(posts[0].user).toMatchObject({ id: 1, name: "Ana" });
  });

  it("embeds parent object into a single item", async () => {
    const res = await server.inject({ method: "GET", url: "/posts/1?_expand=user" });
    expect(res.statusCode).toBe(200);
    const post = res.json();
    expect(post).toHaveProperty("user");
    expect(post.user).toMatchObject({ id: 1, name: "Ana" });
  });

  it("keeps original fields alongside the embedded object", async () => {
    const res = await server.inject({ method: "GET", url: "/posts/1?_expand=user" });
    const post = res.json();
    expect(post.id).toBe(1);
    expect(post.title).toBe("First post");
    expect(post.userId).toBe(1);
    expect(post.user).toBeDefined();
  });

  it("resolves expand by plural collection name", async () => {
    const res = await server.inject({ method: "GET", url: "/posts?_expand=users" });
    expect(res.statusCode).toBe(200);
    const posts = res.json();
    expect(posts[0]).toHaveProperty("users");
    expect(posts[0].users).toMatchObject({ id: 1, name: "Ana" });
  });

  it("silently ignores unknown expand keys", async () => {
    const res = await server.inject({ method: "GET", url: "/posts?_expand=unknown" });
    expect(res.statusCode).toBe(200);
    const posts = res.json();
    expect(posts[0]).not.toHaveProperty("unknown");
  });

  it("does not embed anything when _expand is absent", async () => {
    const res = await server.inject({ method: "GET", url: "/posts" });
    expect(res.statusCode).toBe(200);
    const posts = res.json();
    expect(posts[0]).not.toHaveProperty("user");
  });

  it("returns 404 for unknown item even with _expand", async () => {
    const res = await server.inject({ method: "GET", url: "/posts/999?_expand=user" });
    expect(res.statusCode).toBe(404);
  });

  it("expand works combined with pagination", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/posts?_page=1&_limit=1&_expand=user",
    });
    expect(res.statusCode).toBe(200);
    const posts = res.json();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toHaveProperty("user");
  });

  it("expand works combined with filter", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/posts?userId=1&_expand=user",
    });
    expect(res.statusCode).toBe(200);
    const posts = res.json();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p: Record<string, unknown>) => p["user"] !== undefined)).toBe(true);
  });
});

describe("?_expand on write operations", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof CreateServer>>;

  beforeEach(async () => {
    const result = await createTestServer(YAML_WITH_REL);
    filePath = result.filePath;
    server = result.server;
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("POST embeds parent in created item", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/posts?_expand=user",
      payload: { title: "New post", userId: 1 },
    });
    expect(res.statusCode).toBe(201);
    const post = res.json();
    expect(post).toHaveProperty("user");
    expect(post.user).toMatchObject({ id: 1, name: "Ana" });
  });

  it("PUT embeds parent in replaced item", async () => {
    const res = await server.inject({
      method: "PUT",
      url: "/posts/1?_expand=user",
      payload: { title: "Updated", userId: 1 },
    });
    expect(res.statusCode).toBe(200);
    const post = res.json();
    expect(post).toHaveProperty("user");
    expect(post.user).toMatchObject({ id: 1, name: "Ana" });
  });

  it("PATCH embeds parent in patched item", async () => {
    const res = await server.inject({
      method: "PATCH",
      url: "/posts/1?_expand=user",
      payload: { title: "Patched title" },
    });
    expect(res.statusCode).toBe(200);
    const post = res.json();
    expect(post).toHaveProperty("user");
    expect(post.userId).toBe(1);
  });

  it("DELETE embeds parent in deleted item", async () => {
    const res = await server.inject({
      method: "DELETE",
      url: "/posts/1?_expand=user",
    });
    expect(res.statusCode).toBe(200);
    const post = res.json();
    expect(post).toHaveProperty("user");
    expect(post.user).toMatchObject({ id: 1, name: "Ana" });
  });

  it("write operations work normally without _expand", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/posts",
      payload: { title: "Plain post", userId: 1 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).not.toHaveProperty("user");
  });
});
