import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createYrestServer } from "../../src/api/yrestServer";
import { yrest } from "../../src/api/yrest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function get(url: string) {
  return fetch(url);
}

function post(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function put(url: string, body: unknown) {
  return fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patch(url: string, body: unknown) {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del(url: string) {
  return fetch(url, { method: "DELETE" });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("createYrestServer", () => {
  describe("lifecycle", () => {
    const server = createYrestServer({
      data: yrest`
        users:
          - id: 1
            name: Ana
      `,
      port: 0,
    });

    beforeAll(() => server.start());
    afterAll(() => server.stop());

    it("exposes a numeric port after start()", () => {
      expect(server.port).toBeGreaterThan(0);
    });

    it("exposes a reachable url after start()", async () => {
      const res = await get(`${server.url}/users`);
      expect(res.ok).toBe(true);
    });

    it("url includes the port", () => {
      expect(server.url).toContain(String(server.port));
    });
  });

  describe("inline data — full CRUD", () => {
    const server = createYrestServer({
      data: yrest`
        users:
          - id: 1
            name: Ana
          - id: 2
            name: Luis
      `,
      port: 0,
    });

    beforeAll(() => server.start());
    afterAll(() => server.stop());

    it("GET /users returns the collection", async () => {
      const res = await get(`${server.url}/users`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
    });

    it("GET /users/:id returns the item", async () => {
      const res = await get(`${server.url}/users/1`);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ id: 1, name: "Ana" });
    });

    it("GET /users/:id returns 404 for unknown id", async () => {
      const res = await get(`${server.url}/users/999`);
      expect(res.status).toBe(404);
    });

    it("POST /users creates an item with auto-incremented id", async () => {
      const res = await post(`${server.url}/users`, { name: "Carol" });
      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.id).toBe(3);
      expect(body.name).toBe("Carol");
    });

    it("PUT /users/:id replaces the item", async () => {
      const res = await put(`${server.url}/users/1`, { name: "Ana Updated" });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ id: 1, name: "Ana Updated" });
    });

    it("PATCH /users/:id patches the item", async () => {
      const res = await patch(`${server.url}/users/2`, { name: "Luis Patched" });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ id: 2, name: "Luis Patched" });
    });

    it("DELETE /users/:id removes the item", async () => {
      const res = await del(`${server.url}/users/1`);
      expect(res.status).toBe(200);

      const check = await get(`${server.url}/users/1`);
      expect(check.status).toBe(404);
    });
  });

  describe("option: readonly", () => {
    const server = createYrestServer({
      data: yrest`
        users:
          - id: 1
            name: Ana
      `,
      port: 0,
      readonly: true,
    });

    beforeAll(() => server.start());
    afterAll(() => server.stop());

    it("GET is allowed", async () => {
      const res = await get(`${server.url}/users`);
      expect(res.status).toBe(200);
    });

    it("POST is rejected with 405", async () => {
      const res = await post(`${server.url}/users`, { name: "Carol" });
      expect(res.status).toBe(405);
    });

    it("PUT is rejected with 405", async () => {
      const res = await put(`${server.url}/users/1`, { name: "X" });
      expect(res.status).toBe(405);
    });

    it("DELETE is rejected with 405", async () => {
      const res = await del(`${server.url}/users/1`);
      expect(res.status).toBe(405);
    });
  });

  describe("option: base prefix", () => {
    const server = createYrestServer({
      data: yrest`
        users:
          - id: 1
            name: Ana
      `,
      port: 0,
      base: "/api",
    });

    beforeAll(() => server.start());
    afterAll(() => server.stop());

    it("routes are reachable under the base prefix", async () => {
      const res = await get(`http://localhost:${server.port}/api/users`);
      expect(res.status).toBe(200);
    });

    it("routes without the base prefix return 404", async () => {
      const res = await get(`http://localhost:${server.port}/users`);
      expect(res.status).toBe(404);
    });

    it("url includes the base prefix", () => {
      expect(server.url).toMatch(/\/api$/);
    });
  });

  describe("option: pageable", () => {
    const server = createYrestServer({
      data: yrest`
        items:
          - id: 1
          - id: 2
          - id: 3
      `,
      port: 0,
      pageable: 2,
    });

    beforeAll(() => server.start());
    afterAll(() => server.stop());

    it("wraps response in { data, pagination } envelope", async () => {
      const res = await get(`${server.url}/items`);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("pagination");
    });

    it("pagination object contains total info", async () => {
      const res = await get(`${server.url}/items`);
      const body = (await res.json()) as { pagination: Record<string, unknown> };
      expect(body.pagination).toMatchObject({ totalItems: 3, totalPages: 2 });
    });

    it("respects _page and _limit query params", async () => {
      const res = await get(`${server.url}/items?_page=2&_limit=2`);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data).toHaveLength(1);
    });
  });

  describe("file-based", () => {
    let filePath: string;
    let server: ReturnType<typeof createYrestServer>;

    beforeAll(async () => {
      filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
      writeFileSync(filePath, `users:\n  - id: 1\n    name: Ana\n`, "utf8");
      server = createYrestServer({ file: filePath, port: 0 });
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
      unlinkSync(filePath);
    });

    it("reads data from the YAML file", async () => {
      const res = await get(`${server.url}/users`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });

  describe("isolation — two concurrent servers", () => {
    const serverA = createYrestServer({
      data: yrest`users: [{ id: 1, name: Ana }]`,
      port: 0,
    });

    const serverB = createYrestServer({
      data: yrest`users: [{ id: 1, name: Luis }]`,
      port: 0,
    });

    beforeAll(() => Promise.all([serverA.start(), serverB.start()]));
    afterAll(() => Promise.all([serverA.stop(), serverB.stop()]));

    it("each server listens on a different port", () => {
      expect(serverA.port).not.toBe(serverB.port);
    });

    it("each server has independent data", async () => {
      const a = (await (await get(`${serverA.url}/users/1`)).json()) as Record<string, unknown>;
      const b = (await (await get(`${serverB.url}/users/1`)).json()) as Record<string, unknown>;
      expect(a.name).toBe("Ana");
      expect(b.name).toBe("Luis");
    });

    it("mutations on one server do not affect the other", async () => {
      await del(`${serverA.url}/users/1`);

      const resA = await get(`${serverA.url}/users/1`);
      const resB = await get(`${serverB.url}/users/1`);

      expect(resA.status).toBe(404);
      expect(resB.status).toBe(200);
    });
  });
});
