import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYamlStorage } from "../../src/storage/yamlStorage";
import { createServer } from "../../src/server/createServer";
import { serverOptionsSchema } from "../../src/config/loadOptions";

const YAML_TEN = `
items:
${Array.from({ length: 10 }, (_, i) => `  - id: ${i + 1}\n    value: item-${i + 1}`).join("\n")}
`;

async function createPageableServer(pageableArg: boolean | number) {
  const filePath = join(tmpdir(), `yrest-pageable-${randomUUID()}.yml`);
  writeFileSync(filePath, YAML_TEN, "utf8");
  const storage = createYamlStorage(filePath);
  const options = serverOptionsSchema.parse({ file: filePath, pageable: pageableArg });
  const server = await createServer(storage, options);
  return { server, filePath };
}

describe("pageable mode", () => {
  const files: string[] = [];
  afterEach(() => {
    files.splice(0).forEach((f) => unlinkSync(f));
  });

  it("returns plain array when pageable is disabled", async () => {
    const { server, filePath } = await createPageableServer(false);
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/items" });
    expect(res.statusCode).toBe(200);
    const body = res.json<unknown[]>();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(10);
  });

  it("wraps response in { data, pagination } when pageable is true", async () => {
    const { server, filePath } = await createPageableServer(true);
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/items" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[]; pagination: Record<string, unknown> }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
  });

  it("uses default limit 10 when pageable is true", async () => {
    const { server, filePath } = await createPageableServer(true);
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/items" });
    const body = res.json<{ data: unknown[]; pagination: { limit: number; totalItems: number } }>();
    expect(body.data).toHaveLength(10);
    expect(body.pagination.limit).toBe(10);
    expect(body.pagination.totalItems).toBe(10);
  });

  it("uses custom limit when pageable is a number", async () => {
    const { server, filePath } = await createPageableServer(3);
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/items" });
    const body = res.json<{ data: unknown[]; pagination: { limit: number; totalPages: number } }>();
    expect(body.data).toHaveLength(3);
    expect(body.pagination.limit).toBe(3);
    expect(body.pagination.totalPages).toBe(4);
  });

  it("respects ?_page query param", async () => {
    const { server, filePath } = await createPageableServer(3);
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/items?_page=2" });
    const body = res.json<{
      data: Array<{ id: number }>;
      pagination: { page: number; hasPrev: boolean; hasNext: boolean };
    }>();
    expect(body.pagination.page).toBe(2);
    expect(body.data[0]).toMatchObject({ id: 4 });
    expect(body.pagination.hasPrev).toBe(true);
    expect(body.pagination.hasNext).toBe(true);
  });

  it("respects ?_limit override per request", async () => {
    const { server, filePath } = await createPageableServer(true);
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/items?_limit=5" });
    const body = res.json<{ data: unknown[]; pagination: { limit: number; totalPages: number } }>();
    expect(body.data).toHaveLength(5);
    expect(body.pagination.limit).toBe(5);
    expect(body.pagination.totalPages).toBe(2);
  });

  it("sets isFirst / isLast / hasNext / hasPrev correctly on first page", async () => {
    const { server, filePath } = await createPageableServer(3);
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/items?_page=1" });
    const p = res.json<{ pagination: Record<string, boolean> }>().pagination;
    expect(p["isFirst"]).toBe(true);
    expect(p["isLast"]).toBe(false);
    expect(p["hasNext"]).toBe(true);
    expect(p["hasPrev"]).toBe(false);
  });

  it("sets isFirst / isLast correctly on last page", async () => {
    const { server, filePath } = await createPageableServer(3);
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/items?_page=4" });
    const p = res.json<{ pagination: Record<string, boolean> }>().pagination;
    expect(p["isFirst"]).toBe(false);
    expect(p["isLast"]).toBe(true);
    expect(p["hasPrev"]).toBe(true);
    expect(p["hasNext"]).toBe(false);
  });

  it("does NOT set X-Total-Count header in pageable mode", async () => {
    const { server, filePath } = await createPageableServer(true);
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/items?_page=1" });
    expect(res.headers["x-total-count"]).toBeUndefined();
  });
});
