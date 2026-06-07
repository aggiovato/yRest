import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup, YAML_FIVE_USERS } from "./helpers";
import type { createServer } from "../../src/server/createServer";

describe("GET /collection?_page&_limit (pagination)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_FIVE_USERS));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns first page", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_page=1&_limit=2" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({ id: 1, name: "Alice" });
    expect(body[1]).toMatchObject({ id: 2, name: "Bob" });
  });

  it("returns second page", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_page=2&_limit=2" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({ id: 3, name: "Carol" });
  });

  it("returns partial last page", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_page=3&_limit=2" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("returns empty array for out-of-range page", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_page=99&_limit=2" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(0);
  });

  it("sets X-Total-Count header with total item count", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_page=1&_limit=2" });
    expect(res.headers["x-total-count"]).toBe("5");
  });

  it("_limit alone returns items from page 1", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_limit=3" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(3);
  });

  it("_page alone uses default limit of 10", async () => {
    const res = await server.inject({ method: "GET", url: "/users?_page=1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(5);
  });

  it("X-Total-Count reflects count after filtering", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/users?role=admin&_page=1&_limit=1",
    });
    expect(res.headers["x-total-count"]).toBe("2");
    expect(res.json()).toHaveLength(1);
  });

  it("without pagination params returns all items without header", async () => {
    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.json()).toHaveLength(5);
    expect(res.headers["x-total-count"]).toBeUndefined();
  });
});
