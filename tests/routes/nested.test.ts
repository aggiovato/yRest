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
