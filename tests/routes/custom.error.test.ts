import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup } from "./helpers";
import type { createServer } from "../../src/server/createServer";

const YAML = `
_routes:
  - method: GET
    path: /payments
    error: 503

  - method: GET
    path: /maintenance
    error: 503
    errorBody:
      message: "Service under maintenance"
      retryAfter: 60

  - method: POST
    path: /checkout
    error: 402
    errorBody:
      error: Payment required

  - method: GET
    path: /slow-error
    delay: 200
    error: 500
    errorBody:
      error: Internal Server Error

  - method: GET
    path: /ok
    response:
      status: 200
      body:
        ok: true

  - method: POST
    path: /login
    error: 401
    scenarios:
      - when:
          body.key: bypass
        response:
          status: 200
          body: { token: abc }

users:
  - id: 1
    name: Ana
`;

describe("custom routes — error injection", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns forced error status with default body", async () => {
    const res = await server.inject({ method: "GET", url: "/payments" });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: "Forced error 503" });
  });

  it("returns forced error with custom errorBody", async () => {
    const res = await server.inject({ method: "GET", url: "/maintenance" });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ message: "Service under maintenance", retryAfter: 60 });
  });

  it("supports different error codes (402)", async () => {
    const res = await server.inject({ method: "POST", url: "/checkout" });
    expect(res.statusCode).toBe(402);
    expect(res.json()).toMatchObject({ error: "Payment required" });
  });

  it("applies delay before returning the error", async () => {
    const start = Date.now();
    const res = await server.inject({ method: "GET", url: "/slow-error" });
    expect(res.statusCode).toBe(500);
    expect(Date.now() - start).toBeGreaterThanOrEqual(180);
  });

  it("error takes priority over scenarios and response", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/login",
      payload: { key: "bypass" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("routes without error: work normally", async () => {
    const res = await server.inject({ method: "GET", url: "/ok" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
  });
});
