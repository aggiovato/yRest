import { describe, it, expect, afterEach } from "vitest";
import { AddressInfo } from "node:net";
import * as http from "node:http";
import { createTestServer, cleanup } from "./helpers";

const SSE_YAML_FINITE = `
users:
  - id: 1
    name: Ana

_routes:
  - _method: SSE
    _path: /events/orders
    _sse:
      _interval: 50
      _loop: false
      _events:
        - _event: update
          _data:
            orderId: 1
            status: processing
        - _event: update
          _data:
            orderId: 1
            status: shipped
        - _event: done
          _data:
            orderId: 1
            status: delivered
`;

const SSE_YAML_REPEAT = `
_routes:
  - _method: SSE
    _path: /events/tick
    _sse:
      _interval: 30
      _loop: true
      _repeat: 2
      _events:
        - _event: tick
          _data:
            seq: 1
        - _event: tick
          _data:
            seq: 2
`;

const SSE_YAML_TEMPLATES = `
_routes:
  - _method: SSE
    _path: /events/:channel
    _sse:
      _interval: 20
      _loop: false
      _events:
        - _event: msg
          _data:
            channel: "{{params.channel}}"
            ts: "{{now}}"
`;

const SSE_YAML_NO_EVENT_NAME = `
_routes:
  - _method: SSE
    _path: /events/plain
    _sse:
      _interval: 20
      _loop: false
      _events:
        - _data:
            value: 42
`;

type SseFrame = { event?: string; data: unknown };

function collectSseFrames(url: string, maxFrames: number, timeoutMs: number): Promise<SseFrame[]> {
  return new Promise((resolve, reject) => {
    const frames: SseFrame[] = [];
    let buffer = "";
    let currentEvent: Partial<SseFrame> = {};

    const req = http.get(url, (res) => {
      const timer = setTimeout(() => {
        req.destroy();
        resolve(frames);
      }, timeoutMs);

      res.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent.event = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const raw = line.slice(5).trim();
            try {
              currentEvent.data = JSON.parse(raw);
            } catch {
              currentEvent.data = raw;
            }
            frames.push({ event: currentEvent.event, data: currentEvent.data });
            currentEvent = {};
            if (frames.length >= maxFrames) {
              clearTimeout(timer);
              req.destroy();
              resolve(frames);
            }
          }
        }
      });

      res.on("end", () => {
        clearTimeout(timer);
        resolve(frames);
      });

      res.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    req.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ECONNRESET") {
        resolve(frames);
      } else {
        reject(err);
      }
    });
  });
}

describe("SSE routes", () => {
  let filePath: string;
  let listenedServer: Awaited<ReturnType<typeof createTestServer>>["server"] | null = null;

  afterEach(async () => {
    if (listenedServer) {
      await listenedServer.close();
      listenedServer = null;
    }
    if (filePath) cleanup(filePath);
  });

  async function startServer(yaml: string) {
    const { server, filePath: fp } = await createTestServer(yaml);
    filePath = fp;
    await server.listen({ port: 0, host: "127.0.0.1" });
    listenedServer = server;
    const port = (server.server.address() as AddressInfo).port;
    return { server, port };
  }

  it("emits frames in order and closes when loop is false", async () => {
    const { port } = await startServer(SSE_YAML_FINITE);
    const frames = await collectSseFrames(`http://127.0.0.1:${port}/events/orders`, 10, 2000);

    expect(frames).toHaveLength(3);
    expect(frames[0]).toEqual({ event: "update", data: { orderId: 1, status: "processing" } });
    expect(frames[1]).toEqual({ event: "update", data: { orderId: 1, status: "shipped" } });
    expect(frames[2]).toEqual({ event: "done", data: { orderId: 1, status: "delivered" } });
  });

  it("repeats the sequence N times then closes", async () => {
    const { port } = await startServer(SSE_YAML_REPEAT);
    const frames = await collectSseFrames(`http://127.0.0.1:${port}/events/tick`, 10, 2000);

    expect(frames).toHaveLength(4); // 2 events × 2 repeats
    expect(frames[0]).toEqual({ event: "tick", data: { seq: 1 } });
    expect(frames[1]).toEqual({ event: "tick", data: { seq: 2 } });
    expect(frames[2]).toEqual({ event: "tick", data: { seq: 1 } });
    expect(frames[3]).toEqual({ event: "tick", data: { seq: 2 } });
  });

  it("resolves {{params.X}} and {{now}} per frame", async () => {
    const { port } = await startServer(SSE_YAML_TEMPLATES);
    const frames = await collectSseFrames(`http://127.0.0.1:${port}/events/orders`, 1, 2000);

    expect(frames).toHaveLength(1);
    const data = frames[0].data as Record<string, string>;
    expect(data.channel).toBe("orders");
    expect(typeof data.ts).toBe("string");
    expect(new Date(data.ts).getTime()).toBeGreaterThan(0);
  });

  it("emits unnamed events (no event: line) when _event is absent", async () => {
    const { port } = await startServer(SSE_YAML_NO_EVENT_NAME);
    const frames = await collectSseFrames(`http://127.0.0.1:${port}/events/plain`, 1, 2000);

    expect(frames).toHaveLength(1);
    expect(frames[0].event).toBeUndefined();
    expect(frames[0].data).toEqual({ value: 42 });
  });

  it("sets Content-Type: text/event-stream header", async () => {
    const { port } = await startServer(SSE_YAML_FINITE);

    await new Promise<void>((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}/events/orders`, (res) => {
        try {
          expect(res.headers["content-type"]).toContain("text/event-stream");
          expect(res.headers["cache-control"]).toContain("no-cache");
        } catch (err) {
          reject(err);
        } finally {
          req.destroy();
          resolve();
        }
      });
      req.on("error", (err) => {
        if ((err as NodeJS.ErrnoException).code !== "ECONNRESET") reject(err);
        else resolve();
      });
    });
  });

  it("SSE routes do not interfere with regular collection routes", async () => {
    const { server, filePath: fp } = await createTestServer(SSE_YAML_FINITE);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("parseSseRoutes ignores entries without _sse block", async () => {
    const { server, filePath: fp } = await createTestServer(`
users:
  - id: 1
    name: Ana
_routes:
  - _method: GET
    _path: /auth/me
    _response:
      _status: 200
      _body: { id: 1 }
`);
    filePath = fp;

    const res = await server.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 1 });
  });
});
