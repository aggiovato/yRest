import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { yrestOptionsSchema } from "../../src/config/loadOptions";
import { createTestServer, cleanup } from "./helpers";

const YAML_WITH_CUSTOM_ROUTES = `
users:
  - id: 1
    name: Ana

_routes:
  - method: GET
    path: /auth/me
    response:
      status: 200
      body:
        id: 1
        name: Ana
        role: admin

  - method: POST
    path: /login
    response:
      status: 200
      body:
        token: fake-jwt-token-abc123

  - method: POST
    path: /logout
    response:
      status: 204

  - method: GET
    path: /dashboard/stats
    response:
      status: 200
      headers:
        X-Cache: HIT
      body:
        users: 150
        orders: 32
`;

describe("custom routes", () => {
  let filePath: string;

  afterEach(() => cleanup(filePath));

  it("GET custom route returns static body and status 200", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_CUSTOM_ROUTES);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 1, name: "Ana", role: "admin" });
  });

  it("POST custom route returns body and status 200", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_CUSTOM_ROUTES);
    filePath = fp;

    const res = await server.inject({
      method: "POST",
      url: "/login",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ana@test.com", password: "secret" }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ token: "fake-jwt-token-abc123" });
  });

  it("POST custom route with status 204 returns empty body", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_CUSTOM_ROUTES);
    filePath = fp;

    const res = await server.inject({ method: "POST", url: "/logout" });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
  });

  it("custom route with custom response headers sets the header", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_CUSTOM_ROUTES);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/dashboard/stats" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-cache"]).toBe("HIT");
    expect(res.json()).toMatchObject({ users: 150, orders: 32 });
  });

  it("custom routes do not interfere with collection routes", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_CUSTOM_ROUTES);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("unknown path outside custom routes returns 404", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_CUSTOM_ROUTES);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/auth" });
    expect(res.statusCode).toBe(404);
  });

  it("no custom routes block when _routes is absent", async () => {
    const { server, filePath: fp } = await createTestServer(`
users:
  - id: 1
    name: Ana
`);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.statusCode).toBe(200);
  });

  it("custom route respects --base prefix", async () => {
    const fp = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    filePath = fp;
    writeFileSync(fp, YAML_WITH_CUSTOM_ROUTES, "utf8");
    const storage = createYrestStorage(fp);
    const opts = yrestOptionsSchema.parse({ file: fp, base: "/api" });
    const server = await createServer(storage, opts);

    const hit = await server.inject({ method: "GET", url: "/api/auth/me" });
    expect(hit.statusCode).toBe(200);
    expect(hit.json()).toMatchObject({ role: "admin" });

    const miss = await server.inject({ method: "GET", url: "/auth/me" });
    expect(miss.statusCode).toBe(404);
  });
});
