import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup, YAML_BASIC } from "./helpers";
import type { createServer } from "../../src/server/createServer";

describe("GET /collection?field=value (filtering)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_BASIC));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("filters by a string field", async () => {
    const res = await server.inject({ method: "GET", url: "/users?name=Ana" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 1, name: "Ana" });
  });

  it("filters by a numeric field passed as string", async () => {
    const res = await server.inject({ method: "GET", url: "/users?id=2" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 2, name: "Luis" });
  });

  it("returns empty array when no items match", async () => {
    const res = await server.inject({ method: "GET", url: "/users?name=Unknown" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(0);
  });

  it("applies multiple filters with AND logic", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/users?name=Ana&email=ana@test.com",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("returns empty array when multiple filters conflict", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/users?name=Ana&email=luis@test.com",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(0);
  });

  it("ignores params starting with _ (reserved)", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_page=1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });
});
