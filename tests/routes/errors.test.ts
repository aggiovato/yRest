import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { serverOptionsSchema } from "../../src/config/loadOptions";

const YAML_DB = `
users:
  - id: 1
    name: Alice
`;

async function makeServer() {
  const filePath = join(tmpdir(), `yrest-errors-${randomUUID()}.yml`);
  writeFileSync(filePath, YAML_DB, "utf8");
  const storage = createYrestStorage(filePath);
  const options = serverOptionsSchema.parse({ file: filePath });
  const server = await createServer(storage, options);
  return { server, filePath };
}

describe("error handling", () => {
  const files: string[] = [];
  afterEach(() => {
    files.splice(0).forEach((f) => {
      try {
        unlinkSync(f);
      } catch {
        /* gone */
      }
    });
  });

  // ── Body guard — POST ──────────────────────────────────────────────────────

  it("POST with invalid JSON returns 400", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "POST",
      url: "/users",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toBeDefined();
  });

  it("POST with JSON array returns 400", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "POST",
      url: "/users",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "Bob" }]),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toMatch(/JSON object/);
  });

  it("POST with JSON null returns 400", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "POST",
      url: "/users",
      headers: { "Content-Type": "application/json" },
      body: "null",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toMatch(/JSON object/);
  });

  it("POST without Content-Type returns 415", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "POST",
      url: "/users",
      body: '{"name":"Bob"}',
    });
    expect(res.statusCode).toBe(415);
    expect(typeof res.json<{ error: string }>().error).toBe("string");
  });

  // ── Body guard — PUT ───────────────────────────────────────────────────────

  it("PUT with invalid JSON returns 400", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "PUT",
      url: "/users/1",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });
    expect(res.statusCode).toBe(400);
  });

  it("PUT with JSON array returns 400", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "PUT",
      url: "/users/1",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "Bob" }]),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toMatch(/JSON object/);
  });

  // ── Body guard — PATCH ─────────────────────────────────────────────────────

  it("PATCH with invalid JSON returns 400", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "PATCH",
      url: "/users/1",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });
    expect(res.statusCode).toBe(400);
  });

  it("PATCH with JSON array returns 400", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "PATCH",
      url: "/users/1",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "Bob" }]),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toMatch(/JSON object/);
  });

  // ── Error format consistency ───────────────────────────────────────────────

  it("all 400 errors return { error } shape", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "POST",
      url: "/users",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });
    const body = res.json<Record<string, unknown>>();
    expect(typeof body["error"]).toBe("string");
    expect(body["statusCode"]).toBeUndefined();
  });

  it("404 on unknown resource returns { error } shape", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/users/999" });
    expect(res.statusCode).toBe(404);
    expect(typeof res.json<{ error: string }>().error).toBe("string");
  });
});
