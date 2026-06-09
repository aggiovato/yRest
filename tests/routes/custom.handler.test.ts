import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { HandlerRequest, HandlerMap, Handler } from "../../src/utils/handlers";
import { createYamlStorage } from "../../src/storage/yamlStorage";
import { createServer } from "../../src/server/createServer";
import { serverOptionsSchema } from "../../src/config/loadOptions";
import { cleanup } from "./helpers";

const YAML_WITH_HANDLERS = `
_routes:
  - method: POST
    path: /login
    handler: login

  - method: GET
    path: /me
    handler: me

  - method: POST
    path: /crash
    handler: crashHandler

  - method: GET
    path: /missing
    handler: notDefined

  - method: GET
    path: /static
    response:
      status: 200
      body:
        value: fixed

  - method: GET
    path: /users/:id/card
    handler: userCard

  - method: GET
    path: /nocontent
    handler: noContent

  - method: POST
    path: /echo-body
    handler: echoBody
`;

async function makeServer(yaml: string, handlerMap: HandlerMap = new Map()) {
  const fp = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
  writeFileSync(fp, yaml, "utf8");
  const storage = createYamlStorage(fp);
  const opts = serverOptionsSchema.parse({ file: fp });
  const server = await createServer(storage, opts, handlerMap);
  return { server, filePath: fp };
}

const baseHandlers = new Map<string, Handler>([
  [
    "login",
    async (req: HandlerRequest) => {
      const body = req.body as { email?: string; password?: string };
      if (body?.password !== "secret") return { status: 401, body: { error: "Unauthorized" } };
      return { status: 200, body: { token: `tok-${body.email ?? "?"}` } };
    },
  ],
  ["me", async () => ({ status: 200, body: { id: 1, name: "Ana" } })],
  [
    "crashHandler",
    async () => {
      throw new Error("something went wrong");
    },
  ],
  [
    "userCard",
    async (req: HandlerRequest) => ({
      status: 200,
      body: { userId: req.params["id"], label: `User #${req.params["id"]}` },
    }),
  ],
  ["noContent", async () => ({ status: 204 })],
  ["echoBody", async (req: HandlerRequest) => ({ status: 200, body: req.body })],
]);

describe("custom routes — handler functions", () => {
  let filePath: string;

  afterEach(() => cleanup(filePath));

  it("handler is called and its return value is used as the response", async () => {
    const { server, filePath: fp } = await makeServer(YAML_WITH_HANDLERS, baseHandlers);
    filePath = fp;

    const res = await server.inject({
      method: "POST",
      url: "/login",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ana@test.com", password: "secret" }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ token: "tok-ana@test.com" });
  });

  it("handler can return a non-200 status", async () => {
    const { server, filePath: fp } = await makeServer(YAML_WITH_HANDLERS, baseHandlers);
    filePath = fp;

    const res = await server.inject({
      method: "POST",
      url: "/login",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ana@test.com", password: "wrong" }),
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Unauthorized" });
  });

  it("async handler resolves correctly", async () => {
    const { server, filePath: fp } = await makeServer(YAML_WITH_HANDLERS, baseHandlers);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 1, name: "Ana" });
  });

  it("handler receives path params", async () => {
    const { server, filePath: fp } = await makeServer(YAML_WITH_HANDLERS, baseHandlers);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/users/42/card" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ userId: "42", label: "User #42" });
  });

  it("handler receives and can echo request body", async () => {
    const { server, filePath: fp } = await makeServer(YAML_WITH_HANDLERS, baseHandlers);
    filePath = fp;

    const payload = { x: 1, y: 2 };
    const res = await server.inject({
      method: "POST",
      url: "/echo-body",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(payload);
  });

  it("handler returning status 204 sends empty body", async () => {
    const { server, filePath: fp } = await makeServer(YAML_WITH_HANDLERS, baseHandlers);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/nocontent" });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
  });

  it("handler that throws returns 500 with error message", async () => {
    const { server, filePath: fp } = await makeServer(YAML_WITH_HANDLERS, baseHandlers);
    filePath = fp;

    const res = await server.inject({ method: "POST", url: "/crash" });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toContain("crashHandler");
    expect(res.json().error).toContain("something went wrong");
  });

  it("handler name not in map returns 501", async () => {
    const { server, filePath: fp } = await makeServer(YAML_WITH_HANDLERS, baseHandlers);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/missing" });
    expect(res.statusCode).toBe(501);
    expect(res.json().error).toContain("notDefined");
  });

  it("route without handler: falls back to static response", async () => {
    const { server, filePath: fp } = await makeServer(YAML_WITH_HANDLERS, baseHandlers);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/static" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ value: "fixed" });
  });

  it("handler routes coexist with collection routes", async () => {
    const { server, filePath: fp } = await makeServer(
      `
users:
  - id: 1
    name: Ana
_routes:
  - method: GET
    path: /me
    handler: me
`,
      new Map([["me", async () => ({ status: 200, body: { id: 99 } })]])
    );
    filePath = fp;

    const meRes = await server.inject({ method: "GET", url: "/me" });
    expect(meRes.json()).toEqual({ id: 99 });

    const usersRes = await server.inject({ method: "GET", url: "/users" });
    expect(usersRes.statusCode).toBe(200);
    expect(usersRes.json()).toHaveLength(1);
  });

  it("handler can set custom response headers", async () => {
    const { server, filePath: fp } = await makeServer(
      `
_routes:
  - method: GET
    path: /token
    handler: withHeader
`,
      new Map([
        [
          "withHeader",
          async () => ({
            status: 200,
            body: { ok: true },
            headers: { "X-Token": "abc123" },
          }),
        ],
      ])
    );
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/token" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-token"]).toBe("abc123");
  });
});
