import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup } from "./helpers";
import type { createServer } from "../../src/server/createServer";

const YAML = `
_routes:
  - _method: GET
    _path: /payments
    _error: 503

  - _method: GET
    _path: /maintenance
    _error: 503
    _errorBody:
      message: "Service under maintenance"
      retryAfter: 60

  - _method: POST
    _path: /checkout
    _error: 402
    _errorBody:
      error: Payment required

  - _method: GET
    _path: /slow-error
    _delay: 200
    _error: 500
    _errorBody:
      error: Internal Server Error

  - _method: GET
    _path: /ok
    _response:
      _status: 200
      _body:
        ok: true

  - _method: POST
    _path: /login
    _error: 401
    _scenarios:
      - _when:
          body.key: bypass
        _response:
          _status: 200
          _body: { token: abc }

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
