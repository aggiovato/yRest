import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup, YAML_BASIC } from "./helpers";
import type { createServer } from "../../src/server/createServer";

describe("CRUD routes", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_BASIC));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  describe("GET /collection", () => {
    it("returns all items", async () => {
      const res = await server.inject({ method: "GET", url: "/users" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(2);
    });

    it("returns 404 for unknown collection", async () => {
      const res = await server.inject({ method: "GET", url: "/unknown" });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /collection/:id", () => {
    it("returns item by id", async () => {
      const res = await server.inject({ method: "GET", url: "/users/1" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ id: 1, name: "Ana" });
    });

    it("returns 404 for unknown id", async () => {
      const res = await server.inject({ method: "GET", url: "/users/999" });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /collection", () => {
    it("creates item with auto-generated id", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Carlos", email: "carlos@test.com" },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ id: 3, name: "Carlos" });
    });

    it("respects provided id", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/users",
        payload: { id: 99, name: "Custom" },
      });
      expect(res.json().id).toBe(99);
    });

    it("created item appears in subsequent GET", async () => {
      await server.inject({ method: "POST", url: "/users", payload: { name: "Carlos" } });
      const res = await server.inject({ method: "GET", url: "/users" });
      expect(res.json()).toHaveLength(3);
    });
  });

  describe("PUT /collection/:id", () => {
    it("replaces item completely", async () => {
      const res = await server.inject({
        method: "PUT",
        url: "/users/1",
        payload: { name: "Ana Nueva", role: "admin" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toMatchObject({ id: 1, name: "Ana Nueva", role: "admin" });
      expect(body.email).toBeUndefined();
    });

    it("returns 404 for unknown id", async () => {
      const res = await server.inject({
        method: "PUT",
        url: "/users/999",
        payload: { name: "X" },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /collection/:id", () => {
    it("updates only provided fields", async () => {
      const res = await server.inject({
        method: "PATCH",
        url: "/users/1",
        payload: { role: "admin" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.name).toBe("Ana");
      expect(body.email).toBe("ana@test.com");
      expect(body.role).toBe("admin");
    });

    it("returns 404 for unknown id", async () => {
      const res = await server.inject({
        method: "PATCH",
        url: "/users/999",
        payload: { name: "X" },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /collection/:id", () => {
    it("removes item and returns it", async () => {
      const res = await server.inject({ method: "DELETE", url: "/users/1" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ id: 1, name: "Ana" });
    });

    it("item no longer exists after delete", async () => {
      await server.inject({ method: "DELETE", url: "/users/1" });
      const res = await server.inject({ method: "GET", url: "/users/1" });
      expect(res.statusCode).toBe(404);
    });

    it("returns 404 for unknown id", async () => {
      const res = await server.inject({ method: "DELETE", url: "/users/999" });
      expect(res.statusCode).toBe(404);
    });
  });
});
