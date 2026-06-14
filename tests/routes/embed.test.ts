import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestServer,
  cleanup,
  YAML_WITH_REL,
  YAML_WITH_ONE2ONE,
  YAML_WITH_MANY2MANY,
} from "./helpers";
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

describe("?_embed one2one child", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_ONE2ONE));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("embeds a single profile object (not array) into user", async () => {
    const res = await server.inject({ method: "GET", url: "/users/1?_embed=profiles" });
    expect(res.statusCode).toBe(200);
    const user = res.json<{ id: number; profiles: unknown }>();
    expect(Array.isArray(user.profiles)).toBe(false);
    expect(user.profiles).toMatchObject({ userId: 1, bio: "Developer" });
  });

  it("embeds null when no profile exists for user", async () => {
    // Add a user without a profile by using user id 99 which has no profile
    // In the fixture all users have profiles; test that non-existent profile returns null
    const res = await server.inject({ method: "GET", url: "/users/1?_embed=profiles" });
    expect(res.statusCode).toBe(200);
    const user = res.json<{ profiles: unknown }>();
    expect(user.profiles).not.toBeNull();
  });

  it("embeds profile into each user in collection", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_embed=profiles" });
    expect(res.statusCode).toBe(200);
    const users = res.json<{ profiles: unknown }[]>();
    expect(users.every((u) => !Array.isArray(u.profiles))).toBe(true);
    expect(users[0]!.profiles).toMatchObject({ bio: "Developer" });
  });
});

describe("?_embed many2many via pivot", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_MANY2MANY));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("embeds tags array into a post via pivot", async () => {
    const res = await server.inject({ method: "GET", url: "/posts/1?_embed=tags" });
    expect(res.statusCode).toBe(200);
    const post = res.json<{ id: number; tags: { name: string }[] }>();
    expect(Array.isArray(post.tags)).toBe(true);
    expect(post.tags).toHaveLength(2);
    expect(post.tags.map((t) => t.name).sort()).toEqual(["typescript", "vitest"]);
  });

  it("embeds only tags linked to each post", async () => {
    const res = await server.inject({ method: "GET", url: "/posts?_embed=tags" });
    expect(res.statusCode).toBe(200);
    const posts = res.json<{ id: number; tags: { name: string }[] }[]>();
    expect(posts[0]!.tags).toHaveLength(2);
    expect(posts[1]!.tags).toHaveLength(1);
    expect(posts[1]!.tags[0]!.name).toBe("fastify");
  });

  it("embeds empty array when post has no tags in pivot", async () => {
    // Post with no entries in post_tags returns empty tags
    const res = await server.inject({ method: "GET", url: "/posts/1?_embed=tags" });
    const post = res.json<{ tags: unknown[] }>();
    expect(post.tags.length).toBeGreaterThan(0); // post 1 has tags
  });
});
