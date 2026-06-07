import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup, YAML_WITH_REL } from "./helpers";
import type { createServer } from "../../src/server/createServer";

describe("GET /parent/:id/child (_rel nested routes)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_REL));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns children of a parent", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1/posts" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  it("returns 404 when parent does not exist", async () => {
    const res = await server.inject({ method: "GET", url: "/users/99/posts" });
    expect(res.statusCode).toBe(404);
  });

  it("children match the parent id", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1/posts" });
    const posts = res.json();
    expect(posts.every((p: { userId: number }) => p.userId === 1)).toBe(true);
  });
});

describe("GET /parent/:id/child/:childId (_rel nested item routes)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_REL));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns a single child scoped to its parent", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1/posts/1" });
    expect(res.statusCode).toBe(200);
    const post = res.json<{ id: number; userId: number; title: string }>();
    expect(post.id).toBe(1);
    expect(post.userId).toBe(1);
  });

  it("returns 404 when parent does not exist", async () => {
    const res = await server.inject({ method: "GET", url: "/users/99/posts/1" });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 when child does not exist", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1/posts/99" });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 when child exists but belongs to a different parent", async () => {
    // YAML_WITH_REL has a second post with userId: 1 — add a post for user 2 would be ideal,
    // but with current fixture both posts belong to user 1, so a post id from user 1
    // requested under a valid-but-different parent (user 2) must return 404.
    const res = await server.inject({ method: "GET", url: "/users/2/posts/1" });
    expect(res.statusCode).toBe(404);
  });
});
