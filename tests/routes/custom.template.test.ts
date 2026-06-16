import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { yrestOptionsSchema } from "../../src/config/loadOptions";
import { createTestServer, cleanup } from "./helpers";

const YAML_WITH_TEMPLATES = `
_routes:
  - _method: GET
    _path: /users/:id/summary
    _response:
      _status: 200
      _body:
        requestedId: "{{params.id}}"
        message: "Summary for user {{params.id}}"

  - _method: POST
    _path: /echo
    _response:
      _status: 200
      _body:
        received: "{{body}}"
        requestId: "{{uuid}}"

  - _method: POST
    _path: /greet
    _response:
      _status: 200
      _body:
        greeting: "Hello, {{body.name}}!"
        email: "{{body.email}}"

  - _method: GET
    _path: /search
    _response:
      _status: 200
      _body:
        query: "{{query.q}}"
        results: []

  - _method: GET
    _path: /time
    _response:
      _status: 200
      _body:
        now: "{{now}}"

  - _method: GET
    _path: /id
    _response:
      _status: 200
      _body:
        id: "{{uuid}}"
`;

describe("custom routes — template variables", () => {
  let filePath: string;

  afterEach(() => cleanup(filePath));

  it("{{params.id}} resolves the path parameter as a string", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_TEMPLATES);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/users/42/summary" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.requestedId).toBe("42");
    expect(body.message).toBe("Summary for user 42");
  });

  it("{{body}} in exact position resolves to the full request body object", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_TEMPLATES);
    filePath = fp;

    const payload = { email: "ana@test.com", role: "admin" };
    const res = await server.inject({
      method: "POST",
      url: "/echo",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().received).toEqual(payload);
  });

  it("{{uuid}} resolves to a valid UUID v4 string", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_TEMPLATES);
    filePath = fp;

    const res = await server.inject({
      method: "POST",
      url: "/echo",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const { requestId } = res.json();
    expect(typeof requestId).toBe("string");
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("{{body.field}} resolves a specific field from the request body", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_TEMPLATES);
    filePath = fp;

    const res = await server.inject({
      method: "POST",
      url: "/greet",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Luis", email: "luis@test.com" }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.greeting).toBe("Hello, Luis!");
    expect(body.email).toBe("luis@test.com");
  });

  it("{{query.X}} resolves a query string parameter", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_TEMPLATES);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/search?q=typescript" });
    expect(res.statusCode).toBe(200);
    expect(res.json().query).toBe("typescript");
  });

  it("{{now}} resolves to an ISO 8601 timestamp string", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_TEMPLATES);
    filePath = fp;

    const before = Date.now();
    const res = await server.inject({ method: "GET", url: "/time" });
    const after = Date.now();

    expect(res.statusCode).toBe(200);
    const ts = new Date(res.json().now).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("two requests to the same route produce different {{uuid}} values", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_TEMPLATES);
    filePath = fp;

    const r1 = await server.inject({ method: "GET", url: "/id" });
    const r2 = await server.inject({ method: "GET", url: "/id" });
    expect(r1.json().id).not.toBe(r2.json().id);
  });

  it("missing query param resolves to empty string", async () => {
    const { server, filePath: fp } = await createTestServer(YAML_WITH_TEMPLATES);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/search" });
    expect(res.statusCode).toBe(200);
    expect(res.json().query).toBe("");
  });

  it("static routes alongside template routes are unaffected", async () => {
    const { server, filePath: fp } = await createTestServer(`
_routes:
  - _method: GET
    _path: /static
    _response:
      _status: 200
      _body:
        value: fixed

  - _method: GET
    _path: /dynamic/:id
    _response:
      _status: 200
      _body:
        id: "{{params.id}}"
`);
    filePath = fp;

    const s = await server.inject({ method: "GET", url: "/static" });
    expect(s.json()).toEqual({ value: "fixed" });

    const d = await server.inject({ method: "GET", url: "/dynamic/99" });
    expect(d.json()).toEqual({ id: "99" });
  });

  it("respects --base prefix with template routes", async () => {
    const fp = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    filePath = fp;
    writeFileSync(fp, YAML_WITH_TEMPLATES, "utf8");
    const storage = createYrestStorage(fp);
    const opts = yrestOptionsSchema.parse({ file: fp, base: "/api" });
    const server = await createServer(storage, opts);

    const res = await server.inject({ method: "GET", url: "/api/users/7/summary" });
    expect(res.statusCode).toBe(200);
    expect(res.json().requestedId).toBe("7");
  });
});
