import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { yrestOptionsSchema } from "../../src/config/loadOptions";
import type { createServer as CS } from "../../src/server/createServer";

const YAML = `
users:
  - id: 1
    name: Ana
`;

function createServerWithStrategy(yaml: string, idStrategy: "increment" | "uuid") {
  const filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
  writeFileSync(filePath, yaml, "utf8");
  const storage = createYrestStorage(filePath);
  const options = yrestOptionsSchema.parse({ file: filePath, idStrategy });
  return { filePath, storage, options };
}

describe("id strategy — increment (default)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof CS>>;

  beforeEach(async () => {
    const ctx = createServerWithStrategy(YAML, "increment");
    filePath = ctx.filePath;
    server = await createServer(ctx.storage, ctx.options);
  });

  afterEach(async () => {
    await server.close();
    unlinkSync(filePath);
  });

  it("assigns next integer id on POST", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/users",
      payload: { name: "Luis" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe(2);
  });

  it("increments correctly after multiple POSTs", async () => {
    await server.inject({ method: "POST", url: "/users", payload: { name: "B" } });
    const res = await server.inject({ method: "POST", url: "/users", payload: { name: "C" } });
    expect(res.json().id).toBe(3);
  });
});

describe("id strategy — uuid", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof CS>>;

  beforeEach(async () => {
    const ctx = createServerWithStrategy(YAML, "uuid");
    filePath = ctx.filePath;
    server = await createServer(ctx.storage, ctx.options);
  });

  afterEach(async () => {
    await server.close();
    unlinkSync(filePath);
  });

  it("assigns a UUID string id on POST", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/users",
      payload: { name: "Luis" },
    });
    expect(res.statusCode).toBe(201);
    const { id } = res.json() as { id: string };
    expect(typeof id).toBe("string");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("each POST gets a unique UUID", async () => {
    const r1 = await server.inject({ method: "POST", url: "/users", payload: { name: "B" } });
    const r2 = await server.inject({ method: "POST", url: "/users", payload: { name: "C" } });
    expect(r1.json().id).not.toBe(r2.json().id);
  });

  it("respects explicit id in body even with uuid strategy", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/users",
      payload: { id: "custom-id-123", name: "Carlos" },
    });
    expect(res.json().id).toBe("custom-id-123");
  });
});
