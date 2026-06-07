import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup, YAML_BASIC } from "./helpers";
import type { createServer } from "../../src/server/createServer";

describe("GET /collection?_sort&_order (sorting)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_BASIC));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("sorts by string field ascending", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_sort=name" });
    expect(res.statusCode).toBe(200);
    const names = res.json().map((u: { name: string }) => u.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("sorts by string field descending", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_sort=name&_order=desc" });
    const names = res.json().map((u: { name: string }) => u.name);
    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)));
  });

  it("sorts by numeric field ascending", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_sort=id" });
    const ids = res.json().map((u: { id: number }) => u.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it("sorts by numeric field descending", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_sort=id&_order=desc" });
    const ids = res.json().map((u: { id: number }) => u.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  it("combined with filter", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/users?_sort=name&email=ana@test.com",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0]).toMatchObject({ name: "Ana" });
  });
});
