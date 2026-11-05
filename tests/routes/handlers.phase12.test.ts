/**
 * Phase 12B — handler context (`ctx.collection`), defineHandler / defineSseHandler
 * and handler-driven SSE streams (`_sse: { _handler: name }`).
 */
import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { yrestOptionsSchema } from "../../src/config/loadOptions";
import { parseSseRoutes } from "../../src/storage/parseSseRoutes";
import { defineHandler, defineSseHandler } from "../../src/utils/handlers";
import type { HandlerMap } from "../../src/utils/handlers";
import { cleanup } from "./helpers";

interface User {
  id: number;
  name: string;
  email: string;
}

const YAML = `
users:
  - id: 1
    name: Ana
    email: ana@test.com
_routes:
  - _method: POST
    _path: /login
    _handler: login
  - _method: POST
    _path: /signup
    _handler: signup
  - _method: SSE
    _path: /events/users/:id
    _sse:
      _handler: userStream
  - _method: SSE
    _path: /events/missing
    _sse:
      _handler: notDefined
  - _method: SSE
    _path: /events/crash
    _sse:
      _handler: crashStream
  - _method: SSE
    _path: /events/scripted
    _sse:
      _interval: 10
      _loop: false
      _events:
        - _event: one
          _data: { n: 1 }
`;

const login = defineHandler((req, { collection }) => {
  const { email } = (req.body ?? {}) as { email?: string };
  const user = collection<User>("users").findWhere((u) => u.email === email)[0];
  return user
    ? { body: { token: `tok-${user.id}` } }
    : { status: 401, body: { error: "Unknown user" } };
});

const signup = defineHandler((req, { collection }) => {
  const user = collection<User>("users").create(req.body as Omit<User, "id">);
  return { status: 201, body: user };
});

const userStream = defineSseHandler((req, raw, { collection }) => {
  const user = collection<User>("users").findById(req.params["id"]!);
  raw.write(`event: user\ndata: ${JSON.stringify(user ?? null)}\n\n`);
  raw.write(`event: query\ndata: ${JSON.stringify(req.query)}\n\n`);
  raw.end();
});

const crashStream = defineSseHandler(() => {
  throw new Error("boom");
});

const handlers: HandlerMap = new Map<string, unknown>([
  ["login", login],
  ["signup", signup],
  ["userStream", userStream],
  ["crashStream", crashStream],
]) as HandlerMap;

async function makeServer(idStrategy: "increment" | "uuid" = "increment") {
  const fp = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
  writeFileSync(fp, YAML, "utf8");
  const storage = createYrestStorage(fp);
  const opts = yrestOptionsSchema.parse({ file: fp, idStrategy });
  const server = await createServer(storage, opts, handlers);
  return { server, filePath: fp };
}

type Frame = { event?: string; data: unknown };

/** Reads an SSE response until the server ends it (or the timeout passes). */
function readStream(
  url: string,
  timeoutMs = 1000
): Promise<{ status: number; frames: Frame[]; contentType?: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let buffer = "";
      const timer = setTimeout(() => req.destroy(), timeoutMs);
      res.on("data", (c: Buffer) => (buffer += c.toString()));
      res.on("close", () => {
        clearTimeout(timer);
        const frames = buffer
          .split("\n\n")
          .filter((block) => block.includes("data:"))
          .map((block) => {
            const event = block.match(/^event: (.*)$/m)?.[1];
            const data = JSON.parse(block.match(/^data: (.*)$/m)![1]!);
            return { event, data };
          });
        resolve({ status: res.statusCode ?? 0, frames, contentType: res.headers["content-type"] });
      });
    });
    req.on("error", reject);
  });
}

describe("Phase 12B — handlers", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof makeServer>>["server"] | null = null;

  afterEach(async () => {
    await server?.close();
    server = null;
    if (filePath) cleanup(filePath);
    filePath = "";
  });

  async function listen(idStrategy: "increment" | "uuid" = "increment") {
    const made = await makeServer(idStrategy);
    server = made.server;
    filePath = made.filePath;
    await server.listen({ port: 0 });
    return `http://localhost:${(server.server.address() as AddressInfo).port}`;
  }

  describe("defineHandler / defineSseHandler", () => {
    it("are identity functions", () => {
      const fn = () => ({ status: 200 });
      expect(defineHandler(fn)).toBe(fn);
      const sse = () => undefined;
      expect(defineSseHandler(sse)).toBe(sse);
    });
  });

  describe("ctx.collection in HTTP handlers", () => {
    it("reads the live collection", async () => {
      const made = await makeServer();
      server = made.server;
      filePath = made.filePath;

      const ok = await server.inject({
        method: "POST",
        url: "/login",
        payload: { email: "ana@test.com" },
      });
      expect(ok.statusCode).toBe(200);
      expect(ok.json()).toEqual({ token: "tok-1" });

      const ko = await server.inject({
        method: "POST",
        url: "/login",
        payload: { email: "x@test.com" },
      });
      expect(ko.statusCode).toBe(401);
    });

    it("writes are visible to the REST routes", async () => {
      const made = await makeServer();
      server = made.server;
      filePath = made.filePath;

      const res = await server.inject({
        method: "POST",
        url: "/signup",
        payload: { name: "Luis", email: "luis@test.com" },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ id: 2, name: "Luis" });

      const list = await server.inject({ method: "GET", url: "/users" });
      expect(list.json()).toHaveLength(2);
    });

    it("uses the server id strategy", async () => {
      const made = await makeServer("uuid");
      server = made.server;
      filePath = made.filePath;
      const res = await server.inject({
        method: "POST",
        url: "/signup",
        payload: { name: "Luis" },
      });
      expect(String(res.json().id)).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe("SSE handler streams", () => {
    it("hands the stream to the handler with params, query and collections", async () => {
      const base = await listen();
      const { status, frames, contentType } = await readStream(`${base}/events/users/1?x=1`);
      expect(status).toBe(200);
      expect(contentType).toContain("text/event-stream");
      expect(frames).toEqual([
        { event: "user", data: { id: 1, name: "Ana", email: "ana@test.com" } },
        { event: "query", data: { x: "1" } },
      ]);
    });

    it("answers 501 when the handler is not defined", async () => {
      const made = await makeServer();
      server = made.server;
      filePath = made.filePath;
      const res = await server.inject({ method: "GET", url: "/events/missing" });
      expect(res.statusCode).toBe(501);
      expect(res.json().error).toContain('Handler "notDefined" is not defined');
    });

    it("sends an error event and closes the stream when the handler throws", async () => {
      const base = await listen();
      const { frames } = await readStream(`${base}/events/crash`);
      expect(frames).toEqual([
        { event: "error", data: { error: 'Handler "crashStream" threw an error: boom' } },
      ]);
    });

    it("leaves scripted streams unchanged", async () => {
      const base = await listen();
      const { frames } = await readStream(`${base}/events/scripted`);
      expect(frames).toEqual([{ event: "one", data: { n: 1 } }]);
    });

    it("shows the handler in /_about", async () => {
      const made = await makeServer();
      server = made.server;
      filePath = made.filePath;
      const res = await server.inject({ method: "GET", url: "/_about" });
      expect(res.body).toContain("→ userStream()");
    });
  });
});

describe("parseSseRoutes — _handler", () => {
  it("accepts a _handler without _events", () => {
    const [route] = parseSseRoutes([{ _method: "SSE", _path: "/s", _sse: { _handler: "chat" } }]);
    expect(route).toMatchObject({ path: "/s", handler: "chat", events: [] });
  });

  it("keeps _events alongside _handler", () => {
    const [route] = parseSseRoutes([
      { _method: "SSE", _path: "/s", _sse: { _handler: "chat", _events: [{ _data: 1 }] } },
    ]);
    expect(route?.handler).toBe("chat");
    expect(route?.events).toHaveLength(1);
  });

  it("still rejects an SSE route with neither _events nor _handler", () => {
    expect(parseSseRoutes([{ _method: "SSE", _path: "/s", _sse: { _handler: "  " } }])).toEqual([]);
    expect(parseSseRoutes([{ _method: "SSE", _path: "/s", _sse: {} }])).toEqual([]);
  });

  it("does not set handler on scripted routes", () => {
    const [route] = parseSseRoutes([
      { _method: "SSE", _path: "/s", _sse: { _events: [{ _data: 1 }] } },
    ]);
    expect(route).not.toHaveProperty("handler");
  });
});
