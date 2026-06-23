import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { yrestOptionsSchema } from "../../src/config/loadOptions";
import type { createServer as CS } from "../../src/server/createServer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function setup(yaml: string) {
  const filePath = join(tmpdir(), `yrest-directives-${randomUUID()}.yml`);
  writeFileSync(filePath, yaml, "utf8");
  const storage = createYrestStorage(filePath);
  const options = yrestOptionsSchema.parse({ file: filePath });
  return { filePath, storage, options };
}

describe("__uuid_gen — integration", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof CS>>;

  beforeEach(async () => {
    const ctx = setup(`
users:
  - id: __uuid_gen
    name: Ana
  - id: __uuid_gen
    name: Luis
`);
    filePath = ctx.filePath;
    server = await createServer(ctx.storage, ctx.options);
  });

  afterEach(async () => {
    await server.close();
    unlinkSync(filePath);
  });

  it("GET /users returns items with UUID ids", async () => {
    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.statusCode).toBe(200);
    const users = res.json() as Array<{ id: string; name: string }>;
    expect(users).toHaveLength(2);
    expect(users[0]!.id).toMatch(UUID_RE);
    expect(users[1]!.id).toMatch(UUID_RE);
    expect(users[0]!.id).not.toBe(users[1]!.id);
  });

  it("GET /users/:id works with the generated UUID", async () => {
    const list = (await server.inject({ method: "GET", url: "/users" })).json() as Array<{
      id: string;
    }>;
    const id = list[0]!.id;
    const res = await server.inject({ method: "GET", url: `/users/${id}` });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { id: string }).id).toBe(id);
  });

  it("file on disk has real UUIDs (write-back happened)", () => {
    const content = readFileSync(filePath, "utf8");
    expect(content).not.toContain("__uuid_gen");
    const lines = content.split("\n").filter((l) => l.includes("id:"));
    for (const line of lines) {
      const match = line.match(/id:\s*(.+)/);
      if (match) expect(match[1]!.trim()).toMatch(UUID_RE);
    }
  });
});

describe("__uuid_gen:alias + __fk — integration", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof CS>>;

  beforeEach(async () => {
    const ctx = setup(`
users:
  - id: __uuid_gen:ana
    name: Ana
  - id: __uuid_gen:luis
    name: Luis

posts:
  - id: __uuid_gen
    title: Hello World
    userId: __fk.users:ana
  - id: __uuid_gen
    title: Second Post
    userId: __fk.users:luis
`);
    filePath = ctx.filePath;
    server = await createServer(ctx.storage, ctx.options);
  });

  afterEach(async () => {
    await server.close();
    unlinkSync(filePath);
  });

  it("posts.userId matches the corresponding user.id", async () => {
    const users = (await server.inject({ method: "GET", url: "/users" })).json() as Array<{
      id: string;
      name: string;
    }>;
    const posts = (await server.inject({ method: "GET", url: "/posts" })).json() as Array<{
      id: string;
      userId: string;
      title: string;
    }>;

    const ana = users.find((u) => u.name === "Ana")!;
    const luis = users.find((u) => u.name === "Luis")!;
    const postAna = posts.find((p) => p.title === "Hello World")!;
    const postLuis = posts.find((p) => p.title === "Second Post")!;

    expect(ana.id).toMatch(UUID_RE);
    expect(luis.id).toMatch(UUID_RE);
    expect(postAna.userId).toBe(ana.id);
    expect(postLuis.userId).toBe(luis.id);
  });

  it("file on disk has no directives after write-back", () => {
    const content = readFileSync(filePath, "utf8");
    expect(content).not.toContain("__uuid_gen");
    expect(content).not.toContain("__fk");
  });

  it("reloading the resolved file does not modify it again", () => {
    const before = readFileSync(filePath, "utf8");
    // reload() on an already-resolved file should be a no-op
    const storage = createYrestStorage(filePath);
    const after = readFileSync(filePath, "utf8");
    expect(after).toBe(before);
    void storage; // suppress unused warning
  });
});
