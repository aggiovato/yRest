import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup } from "./helpers";
import type { createServer } from "../../src/server/createServer";

const YAML_WITH_SCENARIOS = `
_routes:
  - method: POST
    path: /login
    scenarios:
      - when:
          body.email: ana@test.com
          body.password: secret
        response:
          status: 200
          body:
            token: tok-ana
      - when:
          body.email: admin@test.com
          body.password: admin
        response:
          status: 200
          body:
            token: tok-admin
            role: admin
    otherwise:
      status: 401
      body:
        error: Invalid credentials

  - method: POST
    path: /login-template
    scenarios:
      - when:
          body.email: ana@test.com
        response:
          status: 200
          body:
            message: "Welcome {{body.email}}"
            id: "{{params.id}}"
    otherwise:
      status: 401
      body:
        error: "Unknown user: {{body.email}}"

  - method: POST
    path: /role-check
    scenarios:
      - when:
          - body.role: admin
          - body.role: superadmin
        response:
          status: 200
          body:
            allowed: true
    otherwise:
      status: 403
      body:
        allowed: false

  - method: POST
    path: /multi-or
    scenarios:
      - when:
          - body.status: active
            body.verified: "true"
          - body.role: superadmin
        response:
          status: 200
          body:
            access: granted
    otherwise:
      status: 403
      body:
        access: denied

  - method: POST
    path: /login-old
    response:
      status: 401
      body:
        error: Invalid credentials
    scenarios:
      - when:
          body.email: ana@test.com
          body.password: secret
        response:
          status: 200
          body:
            token: tok-ana
      - when:
          body.email: admin@test.com
          body.password: admin
        response:
          status: 200
          body:
            token: tok-admin
            role: admin

  - method: GET
    path: /users/:id/status
    response:
      status: 200
      body:
        status: unknown
    scenarios:
      - when:
          params.id: "1"
        response:
          status: 200
          body:
            status: active

  - method: GET
    path: /search
    response:
      status: 200
      body:
        results: []
    scenarios:
      - when:
          query.q: admin
        response:
          status: 200
          body:
            results:
              - id: 1
                name: Admin User

  - method: POST
    path: /flags
    response:
      status: 200
      body:
        matched: none
    scenarios:
      - when:
          body.name_like: ana
        response:
          status: 200
          body:
            matched: like
      - when:
          body.age_gte: "18"
        response:
          status: 200
          body:
            matched: gte
      - when:
          body.role_ne: user
        response:
          status: 200
          body:
            matched: ne

  - method: POST
    path: /echo-header
    response:
      status: 401
      body:
        error: unauthorized
    scenarios:
      - when:
          headers.x-api-key: secret-key
        response:
          status: 200
          body:
            ok: true

  - method: GET
    path: /fast
    response:
      status: 200
      body:
        ok: true

  - method: GET
    path: /slow
    delay: 300
    response:
      status: 200
      body:
        ok: true

users:
  - id: 1
    name: Ana
`;

describe("custom routes — scenarios", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_SCENARIOS));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  describe("body conditions", () => {
    it("returns matching scenario when all body conditions match", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/login",
        payload: { email: "ana@test.com", password: "secret" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ token: "tok-ana" });
    });

    it("returns second scenario when first does not match", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/login",
        payload: { email: "admin@test.com", password: "admin" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ token: "tok-admin", role: "admin" });
    });

    it("falls back to route response when no scenario matches", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/login",
        payload: { email: "unknown@test.com", password: "wrong" },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: "Invalid credentials" });
    });

    it("requires ALL conditions to match (AND semantics)", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/login",
        // correct email but wrong password
        payload: { email: "ana@test.com", password: "wrong" },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("params conditions", () => {
    it("matches on URL path param", async () => {
      const res = await server.inject({ method: "GET", url: "/users/1/status" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: "active" });
    });

    it("falls back when param does not match", async () => {
      const res = await server.inject({ method: "GET", url: "/users/99/status" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: "unknown" });
    });
  });

  describe("query conditions", () => {
    it("matches on query string param", async () => {
      const res = await server.inject({ method: "GET", url: "/search?q=admin" });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { results: unknown[] };
      expect(body.results).toHaveLength(1);
    });

    it("falls back when query param does not match", async () => {
      const res = await server.inject({ method: "GET", url: "/search?q=other" });
      const body = res.json() as { results: unknown[] };
      expect(body.results).toHaveLength(0);
    });
  });

  describe("header conditions", () => {
    it("matches on request header", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/echo-header",
        headers: { "x-api-key": "secret-key" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ ok: true });
    });

    it("falls back when header is absent or wrong", async () => {
      const res = await server.inject({ method: "POST", url: "/echo-header" });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("operator conditions", () => {
    it("_like matches substring (case-insensitive)", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/flags",
        payload: { name: "AnaLuisa" },
      });
      expect(res.json()).toMatchObject({ matched: "like" });
    });

    it("_gte matches when value is greater than or equal", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/flags",
        payload: { age: 20 },
      });
      expect(res.json()).toMatchObject({ matched: "gte" });
    });

    it("_ne matches when value is not equal", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/flags",
        payload: { role: "admin" },
      });
      expect(res.json()).toMatchObject({ matched: "ne" });
    });

    it("falls back when no operator condition matches", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/flags",
        payload: { role: "user", age: 10, name: "Bob" },
      });
      expect(res.json()).toMatchObject({ matched: "none" });
    });
  });

  describe("priority", () => {
    it("first matching scenario wins over later ones", async () => {
      // name_like: ana matches first — _gte and _ne are not evaluated
      const res = await server.inject({
        method: "POST",
        url: "/flags",
        payload: { name: "Ana", age: 25, role: "admin" },
      });
      expect(res.json()).toMatchObject({ matched: "like" });
    });
  });

  describe("otherwise", () => {
    it("returns otherwise when no scenario matches", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/login",
        payload: { email: "unknown@test.com", password: "wrong" },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: "Invalid credentials" });
    });

    it("does not return otherwise when a scenario matches", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/login",
        payload: { email: "ana@test.com", password: "secret" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ token: "tok-ana" });
    });

    it("otherwise supports template variables", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/login-template",
        payload: { email: "stranger@test.com" },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: "Unknown user: stranger@test.com" });
    });
  });

  describe("template variables in scenarios", () => {
    it("interpolates body fields in the scenario response", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/login-template",
        payload: { email: "ana@test.com" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ message: "Welcome ana@test.com" });
    });
  });

  describe("per-route delay", () => {
    it("responds without delay on routes without delay:", async () => {
      const start = Date.now();
      await server.inject({ method: "GET", url: "/fast" });
      expect(Date.now() - start).toBeLessThan(200);
    });

    it("applies per-route delay before responding", async () => {
      const start = Date.now();
      await server.inject({ method: "GET", url: "/slow" });
      expect(Date.now() - start).toBeGreaterThanOrEqual(250);
    });
  });

  describe("OR conditions (array when)", () => {
    it("matches when any OR group satisfies the condition", async () => {
      const admin = await server.inject({
        method: "POST",
        url: "/role-check",
        payload: { role: "admin" },
      });
      expect(admin.json()).toMatchObject({ allowed: true });

      const superadmin = await server.inject({
        method: "POST",
        url: "/role-check",
        payload: { role: "superadmin" },
      });
      expect(superadmin.json()).toMatchObject({ allowed: true });
    });

    it("falls through to otherwise when no OR group matches", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/role-check",
        payload: { role: "user" },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ allowed: false });
    });

    it("each OR group is evaluated with AND internally", async () => {
      // status: active AND verified: true → granted
      const res = await server.inject({
        method: "POST",
        url: "/multi-or",
        payload: { status: "active", verified: true },
      });
      expect(res.json()).toMatchObject({ access: "granted" });

      // status: active but NOT verified → first group fails, no superadmin → denied
      const res2 = await server.inject({
        method: "POST",
        url: "/multi-or",
        payload: { status: "active", verified: false },
      });
      expect(res2.json()).toMatchObject({ access: "denied" });

      // superadmin shortcut → granted
      const res3 = await server.inject({
        method: "POST",
        url: "/multi-or",
        payload: { role: "superadmin" },
      });
      expect(res3.json()).toMatchObject({ access: "granted" });
    });
  });
});
