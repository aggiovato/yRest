/**
 * Regression tests for GET /_about
 *
 * Key regression: v0.8.1 crashed with `TypeError: parent.endsWith is not a function`
 * when `_rel` contained object-format relations (one2one, many2many) instead of
 * the legacy string shorthand. The bug was in the nested-routes loop inside
 * about.template.ts which assumed relation values were strings, not RelationDef objects.
 *
 * These tests ensure /_about always returns 200 regardless of relation format.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestServer,
  cleanup,
  YAML_BASIC,
  YAML_WITH_REL,
  YAML_WITH_ONE2ONE,
  YAML_WITH_MANY2MANY,
  YAML_WITH_NESTED,
} from "./helpers";
import type { createServer } from "../../src/server/createServer";

async function getAbout(
  server: Awaited<ReturnType<typeof createServer>>
): Promise<{ status: number; html: string }> {
  const res = await server.inject({ method: "GET", url: "/_about" });
  return { status: res.statusCode, html: res.body };
}

describe("GET /_about — basic rendering", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_BASIC));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns 200 with text/html", async () => {
    const res = await server.inject({ method: "GET", url: "/_about" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
  });

  it("includes a DOCTYPE declaration", async () => {
    const { html } = await getAbout(server);
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("lists resource names", async () => {
    const { html } = await getAbout(server);
    expect(html).toContain("/users");
  });
});

describe("GET /_about — regression: crash with many2one string shorthand", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_REL));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns 200 with many2one string-shorthand _rel", async () => {
    const { status } = await getAbout(server);
    expect(status).toBe(200);
  });

  it("shows nested routes section", async () => {
    const { html } = await getAbout(server);
    expect(html).toContain("Nested routes");
  });
});

describe("GET /_about — regression: crash with one2one object _rel (was TypeError in 0.8.1)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_ONE2ONE));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns 200 with one2one object-format _rel", async () => {
    // In v0.8.1: parent = { type: "one2one", target: "users" } → parent.endsWith → TypeError → 500
    const { status } = await getAbout(server);
    expect(status).toBe(200);
  });

  it("includes nested routes section with one2one relation", async () => {
    const { html } = await getAbout(server);
    expect(html).toContain("Nested routes");
    expect(html).toContain("profiles");
  });
});

describe("GET /_about — regression: crash with many2many object _rel (was TypeError in 0.8.1)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_MANY2MANY));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns 200 with many2many object-format _rel", async () => {
    // In v0.8.1: parent = { type: "many2many", ... } → parent.endsWith → TypeError → 500
    const { status } = await getAbout(server);
    expect(status).toBe(200);
  });

  it("shows both forward and inverse many2many routes", async () => {
    const { html } = await getAbout(server);
    // forward: /posts/:id/tags
    expect(html).toContain("/posts/:id/tags");
    // inverse: /tags/:id/posts
    expect(html).toContain("/tags/:id/posts");
  });

  it("shows many2many badge", async () => {
    const { html } = await getAbout(server);
    expect(html).toContain("many2many");
  });
});

describe("GET /_about — nested: true badge display", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_NESTED));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns 200 with nested:true relations", async () => {
    const { status } = await getAbout(server);
    expect(status).toBe(200);
  });

  it("shows the nested badge for relations with nested:true", async () => {
    const { html } = await getAbout(server);
    expect(html).toContain("nested");
  });
});
