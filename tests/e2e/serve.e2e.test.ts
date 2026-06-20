/**
 * E2E tests for the `yrest serve` command.
 *
 * Spawns the real CLI process (dist/cli/index.js) against a temporary YAML file,
 * waits for it to start, then makes actual HTTP requests using Node's native fetch.
 *
 * Prerequisites: the project must be built (`npm run build`) before running these.
 * Run in isolation: npm run test:e2e
 *
 * Each describe block shares one server instance (beforeAll/afterAll) to minimise
 * process spawns. Mutation tests (POST/PUT/PATCH/DELETE) clean up after themselves.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createServer as netServer } from "node:net";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const CLI = join(ROOT, "dist/cli/index.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

function freePort(): Promise<number> {
  return new Promise((res) => {
    const srv = netServer();
    srv.listen(0, () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close(() => res(port));
    });
  });
}

function tmpYaml(content: string): string {
  const path = join(tmpdir(), `yrest-e2e-${randomUUID()}.yml`);
  writeFileSync(path, content, "utf8");
  return path;
}

interface StartedServer {
  proc: ChildProcess;
  port: number;
  url: string;
  file: string;
  stop: () => Promise<void>;
}

function startServe(yamlContent: string, extraArgs: string[] = []): Promise<StartedServer> {
  return new Promise((resolve, reject) => {
    const file = tmpYaml(yamlContent);

    const proc = spawn("node", [CLI, "serve", file, ...extraArgs], {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let resolvedPort = 0;
    let settled = false;

    const done = (p: number) => {
      if (settled) return;
      settled = true;
      resolvedPort = p;
      resolve({
        proc,
        port: resolvedPort,
        url: `http://localhost:${resolvedPort}`,
        file,
        stop: () =>
          new Promise<void>((res) => {
            proc.on("exit", () => res());
            proc.kill("SIGTERM");
          }),
      });
    };

    proc.stdout?.on("data", (chunk: Buffer) => {
      const m = chunk.toString().match(/:(\d+)/);
      if (m) done(parseInt(m[1], 10));
    });

    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (!settled) reject(new Error(`process exited early with code ${code}`));
    });

    setTimeout(() => {
      if (!settled) reject(new Error("server did not print a port within 8 s"));
    }, 8000);
  });
}

// ── YAML fixtures ─────────────────────────────────────────────────────────────

const YAML_FULL = `
_rel:
  posts:
    userId: users
_routes:
  - _method: GET
    _path: /health
    _response:
      _status: 200
      _body:
        ok: true
  - _method: POST
    _path: /echo
    _scenarios:
      - _when:
          _body.role: admin
        _response:
          _status: 200
          _body:
            granted: true
    _otherwise:
      _status: 403
      _body:
        granted: false
users:
  - id: 1
    name: Ana
    email: ana@test.com
  - id: 2
    name: Luis
    email: luis@test.com
posts:
  - id: 1
    title: First post
    userId: 1
  - id: 2
    title: Second post
    userId: 1
`;

const YAML_SIMPLE = `
users:
  - id: 1
    name: Ana
`;

// ── CRUD — all 6 endpoints ────────────────────────────────────────────────────

describe("serve — CRUD endpoints", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_FULL, ["--port", String(port)]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("GET /collection returns all items", async () => {
    const res = await fetch(`${srv.url}/users`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(2);
  });

  it("GET /collection/:id returns the item", async () => {
    const res = await fetch(`${srv.url}/users/1`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 1, name: "Ana" });
  });

  it("GET /collection/:id returns 404 for missing id", async () => {
    const res = await fetch(`${srv.url}/users/999`);
    expect(res.status).toBe(404);
  });

  it("POST /collection creates an item and returns 201", async () => {
    const res = await fetch(`${srv.url}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Carlos" }),
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: number; name: string };
    expect(typeof created.id).toBe("number");
    expect(created.name).toBe("Carlos");

    // cleanup
    await fetch(`${srv.url}/users/${created.id}`, { method: "DELETE" });
  });

  it("PUT /collection/:id replaces the item", async () => {
    const res = await fetch(`${srv.url}/users/2`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 2, name: "Luis Updated", email: "luis@new.com" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ name: "Luis Updated", email: "luis@new.com" });

    // restore
    await fetch(`${srv.url}/users/2`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 2, name: "Luis", email: "luis@test.com" }),
    });
  });

  it("PATCH /collection/:id partially updates the item", async () => {
    const res = await fetch(`${srv.url}/users/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ana Patched" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "Ana Patched", email: "ana@test.com" });

    // restore
    await fetch(`${srv.url}/users/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ana" }),
    });
  });

  it("DELETE /collection/:id removes the item", async () => {
    const created = (await (
      await fetch(`${srv.url}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Temp" }),
      })
    ).json()) as { id: number };

    const del = await fetch(`${srv.url}/users/${created.id}`, { method: "DELETE" });
    expect(del.status).toBe(200);

    const gone = await fetch(`${srv.url}/users/${created.id}`);
    expect(gone.status).toBe(404);
  });

  it("GET /unknown returns 404", async () => {
    const res = await fetch(`${srv.url}/nonexistent`);
    expect(res.status).toBe(404);
  });
});

// ── Meta endpoints ────────────────────────────────────────────────────────────

describe("serve — meta endpoints", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_FULL, ["--port", String(port)]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("GET /_about returns 200 HTML", async () => {
    const res = await fetch(`${srv.url}/_about`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("/_about HTML lists the collection name", async () => {
    const html = await (await fetch(`${srv.url}/_about`)).text();
    expect(html).toContain("users");
    expect(html).toContain("posts");
  });

  it("/_about HTML lists the custom route", async () => {
    const html = await (await fetch(`${srv.url}/_about`)).text();
    expect(html).toContain("/health");
    expect(html).toContain("/echo");
  });

  it("GET /_openapi.json returns valid OpenAPI 3.0 document", async () => {
    const res = await fetch(`${srv.url}/_openapi.json`);
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.paths).toHaveProperty("/users");
    expect(doc.paths).toHaveProperty("/users/{id}");
    expect(doc.paths).toHaveProperty("/posts");
  });

  it("GET /_openapi returns YAML content-type", async () => {
    const res = await fetch(`${srv.url}/_openapi`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/yaml");
  });
});

// ── Query parameters ──────────────────────────────────────────────────────────

describe("serve — query parameters", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_FULL, ["--port", String(port)]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("?name= filters by field value", async () => {
    const res = await fetch(`${srv.url}/users?name=Ana`);
    const body = (await res.json()) as { name: string }[];
    expect(body).toHaveLength(1);
    expect(body[0]?.name).toBe("Ana");
  });

  it("?_page=&_limit= paginates results", async () => {
    const res = await fetch(`${srv.url}/users?_page=1&_limit=1`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(1);
    expect(res.headers.get("x-total-count")).toBe("2");
  });

  it("?_sort=&_order= sorts results", async () => {
    const res = await fetch(`${srv.url}/users?_sort=name&_order=desc`);
    const body = (await res.json()) as { name: string }[];
    expect(body[0]?.name).toBe("Luis");
    expect(body[1]?.name).toBe("Ana");
  });

  it("?_q= full-text searches across fields", async () => {
    const res = await fetch(`${srv.url}/users?_q=ana`);
    const body = (await res.json()) as { name: string }[];
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0]?.name).toBe("Ana");
  });
});

// ── Custom routes ─────────────────────────────────────────────────────────────

describe("serve — custom routes", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_FULL, ["--port", String(port)]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("GET static custom route returns configured body", async () => {
    const res = await fetch(`${srv.url}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("POST custom route returns scenario response when condition matches", async () => {
    const res = await fetch(`${srv.url}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ granted: true });
  });

  it("POST custom route returns _otherwise when no scenario matches", async () => {
    const res = await fetch(`${srv.url}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user" }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ granted: false });
  });
});

// ── Relations ─────────────────────────────────────────────────────────────────

describe("serve — relations", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_FULL, ["--port", String(port)]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("GET /parent/:id/child returns nested collection filtered by FK", async () => {
    const res = await fetch(`${srv.url}/users/1/posts`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: number }[];
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body.every((p) => p.userId === 1)).toBe(true);
  });

  it("GET /parent/:id/child returns empty array for parent with no children", async () => {
    const res = await fetch(`${srv.url}/users/2/posts`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(0);
  });
});

// ── --base flag ───────────────────────────────────────────────────────────────

describe("serve — --base flag", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_SIMPLE, ["--port", String(port), "--base", "/api"]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("responds at /api/collection", async () => {
    const res = await fetch(`${srv.url}/api/users`);
    expect(res.status).toBe(200);
  });

  it("returns 404 without base prefix", async () => {
    const res = await fetch(`${srv.url}/users`);
    expect(res.status).toBe(404);
  });
});

// ── --readonly flag ───────────────────────────────────────────────────────────

describe("serve — --readonly flag", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_SIMPLE, ["--port", String(port), "--readonly"]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("GET /collection still works", async () => {
    const res = await fetch(`${srv.url}/users`);
    expect(res.status).toBe(200);
  });

  it("POST returns 405", async () => {
    const res = await fetch(`${srv.url}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(405);
  });

  it("PUT returns 405", async () => {
    const res = await fetch(`${srv.url}/users/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 1, name: "X" }),
    });
    expect(res.status).toBe(405);
  });

  it("PATCH returns 405", async () => {
    const res = await fetch(`${srv.url}/users/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(405);
  });

  it("DELETE returns 405", async () => {
    const res = await fetch(`${srv.url}/users/1`, { method: "DELETE" });
    expect(res.status).toBe(405);
  });
});

// ── --delay flag ──────────────────────────────────────────────────────────────

describe("serve — --delay flag", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_SIMPLE, ["--port", String(port), "--delay", "300"]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("adds the configured latency to every response", async () => {
    const start = Date.now();
    await fetch(`${srv.url}/users`);
    expect(Date.now() - start).toBeGreaterThanOrEqual(250);
  });
});

// ── --pageable flag ───────────────────────────────────────────────────────────

describe("serve — --pageable flag", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_FULL, ["--port", String(port), "--pageable"]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("wraps GET /collection in { data, pagination } envelope", async () => {
    const res = await fetch(`${srv.url}/users`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[]; pagination: { totalItems: number } };
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.pagination?.totalItems).toBe("number");
  });

  it("pagination.totalItems reflects the full collection count", async () => {
    const body = (await (await fetch(`${srv.url}/users`)).json()) as {
      pagination: { totalItems: number };
    };
    expect(body.pagination.totalItems).toBe(2);
  });
});

// ── --snapshot flag ───────────────────────────────────────────────────────────

describe("serve — --snapshot flag", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_SIMPLE, ["--port", String(port), "--snapshot"]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("GET /_snapshot returns current state", async () => {
    const res = await fetch(`${srv.url}/_snapshot`);
    expect(res.status).toBe(200);
  });

  it("POST /_snapshot/save responds 200", async () => {
    const res = await fetch(`${srv.url}/_snapshot/save`, { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("POST /_snapshot/reset restores data to saved state", async () => {
    await fetch(`${srv.url}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Temporary" }),
    });

    const before = (await (await fetch(`${srv.url}/users`)).json()) as unknown[];
    expect(before.length).toBeGreaterThan(1);

    await fetch(`${srv.url}/_snapshot/reset`, { method: "POST" });

    const after = (await (await fetch(`${srv.url}/users`)).json()) as unknown[];
    expect(after).toHaveLength(1);
  });
});

// ── --id-strategy uuid ────────────────────────────────────────────────────────

describe("serve — --id-strategy uuid", { timeout: 20000 }, () => {
  let srv: StartedServer;

  beforeAll(async () => {
    const port = await freePort();
    srv = await startServe(YAML_SIMPLE, ["--port", String(port), "--id-strategy", "uuid"]);
  });

  afterAll(async () => {
    await srv.stop();
    unlinkSync(srv.file);
  });

  it("POST assigns a UUID string as id", async () => {
    const res = await fetch(`${srv.url}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New" }),
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: unknown };
    expect(typeof created.id).toBe("string");
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
