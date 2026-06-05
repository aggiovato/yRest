import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYamlStorage } from "../src/storage/yamlStorage";
import { createServer } from "../src/server/createServer";
import { serverOptionsSchema } from "../src/config/loadOptions";

const SAMPLE_YAML = `
users:
  - id: 1
    name: Ana
    email: ana@test.com
  - id: 2
    name: Luis
    email: luis@test.com
`;

const SAMPLE_YAML_PAGINATION = `
users:
  - id: 1
    name: Alice
    role: admin
  - id: 2
    name: Bob
    role: user
  - id: 3
    name: Carol
    role: user
  - id: 4
    name: Dave
    role: admin
  - id: 5
    name: Eve
    role: user
`;

const SAMPLE_YAML_WITH_REL = `
_rel:
  posts:
    userId: users
users:
  - id: 1
    name: Ana
    email: ana@test.com
posts:
  - id: 1
    title: First post
    userId: 1
  - id: 2
    title: Second post
    userId: 1
`;

const options = serverOptionsSchema.parse({ file: "db.yml" });

describe("CRUD routes", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    writeFileSync(filePath, SAMPLE_YAML, "utf8");
    const storage = createYamlStorage(filePath);
    server = await createServer(storage, options);
  });

  afterEach(async () => {
    await server.close();
    unlinkSync(filePath);
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

  describe("GET /collection?field=value (filtering)", () => {
    it("filters by a string field", async () => {
      const res = await server.inject({ method: "GET", url: "/users?name=Ana" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ id: 1, name: "Ana" });
    });

    it("filters by a numeric field passed as string", async () => {
      const res = await server.inject({ method: "GET", url: "/users?id=2" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ id: 2, name: "Luis" });
    });

    it("returns empty array when no items match", async () => {
      const res = await server.inject({ method: "GET", url: "/users?name=Unknown" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(0);
    });

    it("applies multiple filters with AND logic", async () => {
      const res = await server.inject({ method: "GET", url: "/users?name=Ana&email=ana@test.com" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it("returns empty array when multiple filters conflict", async () => {
      const res = await server.inject({ method: "GET", url: "/users?name=Ana&email=luis@test.com" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(0);
    });

    it("ignores params starting with _ (reserved)", async () => {
      const res = await server.inject({ method: "GET", url: "/users?_page=1" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(2);
    });
  });

  describe("GET /collection?_page&_limit (pagination)", () => {
    let pageServer: Awaited<ReturnType<typeof createServer>>;
    let pageFilePath: string;

    beforeEach(async () => {
      pageFilePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
      writeFileSync(pageFilePath, SAMPLE_YAML_PAGINATION, "utf8");
      const storage = createYamlStorage(pageFilePath);
      pageServer = await createServer(storage, options);
    });

    afterEach(async () => {
      await pageServer.close();
      unlinkSync(pageFilePath);
    });

    it("returns first page", async () => {
      const res = await pageServer.inject({ method: "GET", url: "/users?_page=1&_limit=2" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(2);
      expect(body[0]).toMatchObject({ id: 1, name: "Alice" });
      expect(body[1]).toMatchObject({ id: 2, name: "Bob" });
    });

    it("returns second page", async () => {
      const res = await pageServer.inject({ method: "GET", url: "/users?_page=2&_limit=2" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(2);
      expect(body[0]).toMatchObject({ id: 3, name: "Carol" });
    });

    it("returns partial last page", async () => {
      const res = await pageServer.inject({ method: "GET", url: "/users?_page=3&_limit=2" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it("returns empty array for out-of-range page", async () => {
      const res = await pageServer.inject({ method: "GET", url: "/users?_page=99&_limit=2" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(0);
    });

    it("sets X-Total-Count header with total filtered count", async () => {
      const res = await pageServer.inject({ method: "GET", url: "/users?_page=1&_limit=2" });
      expect(res.headers["x-total-count"]).toBe("5");
    });

    it("_limit alone returns items from page 1", async () => {
      const res = await pageServer.inject({ method: "GET", url: "/users?_limit=3" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(3);
    });

    it("_page alone uses default limit of 10", async () => {
      const res = await pageServer.inject({ method: "GET", url: "/users?_page=1" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(5);
    });

    it("X-Total-Count reflects count after filtering", async () => {
      const res = await pageServer.inject({ method: "GET", url: "/users?role=admin&_page=1&_limit=1" });
      expect(res.headers["x-total-count"]).toBe("2");
      expect(res.json()).toHaveLength(1);
    });

    it("without pagination params returns all items without header", async () => {
      const res = await pageServer.inject({ method: "GET", url: "/users" });
      expect(res.json()).toHaveLength(5);
      expect(res.headers["x-total-count"]).toBeUndefined();
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
      await server.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Carlos" },
      });
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

  describe("GET /parent/:id/child (_rel)", () => {
    let relServer: Awaited<ReturnType<typeof createServer>>;
    let relFilePath: string;

    beforeEach(async () => {
      relFilePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
      writeFileSync(relFilePath, SAMPLE_YAML_WITH_REL, "utf8");
      const storage = createYamlStorage(relFilePath);
      relServer = await createServer(storage, options);
    });

    afterEach(async () => {
      await relServer.close();
      unlinkSync(relFilePath);
    });

    it("returns children of a parent", async () => {
      const res = await relServer.inject({ method: "GET", url: "/users/1/posts" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(2);
    });

    it("returns empty array when parent has no children", async () => {
      const res = await relServer.inject({ method: "GET", url: "/users/99/posts" });
      expect(res.statusCode).toBe(404);
    });

    it("children match the parent id", async () => {
      const res = await relServer.inject({ method: "GET", url: "/users/1/posts" });
      const posts = res.json();
      expect(posts.every((p: { userId: number }) => p.userId === 1)).toBe(true);
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
