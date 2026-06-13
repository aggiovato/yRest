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
    email: alice@example.com
    role: admin
  - id: 2
    name: Bob
    email: bob@test.com
    role: user
  - id: 3
    name: Ana
    email: ana@example.com
    role: user
  - id: 4
    name: Charlie
    email: charlie@work.com
    role: admin
`;

async function makeServer() {
  const filePath = join(tmpdir(), `yrest-fulltext-${randomUUID()}.yml`);
  writeFileSync(filePath, YAML_DB, "utf8");
  const storage = createYrestStorage(filePath);
  const options = serverOptionsSchema.parse({ file: filePath });
  const server = await createServer(storage, options);
  return { server, filePath };
}

describe("?_q full-text search", () => {
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

  it("matches items where any field contains the term", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/users?_q=example" });
    expect(res.statusCode).toBe(200);
    const items = res.json<{ email: string }[]>();
    expect(items).toHaveLength(2);
    expect(items.every((u) => u.email.includes("example"))).toBe(true);
  });

  it("is case-insensitive", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/users?_q=ALICE" });
    const items = res.json<{ name: string }[]>();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe("Alice");
  });

  it("searches across multiple fields", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    // "admin" appears in role field of users 1 and 4
    const res = await server.inject({ method: "GET", url: "/users?_q=admin" });
    const items = res.json<unknown[]>();
    expect(items).toHaveLength(2);
  });

  it("returns empty array when no match", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/users?_q=zzznomatch" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(0);
  });

  it("can be combined with field filters", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    // _q=example (alice + ana) AND role=admin → only alice
    const res = await server.inject({ method: "GET", url: "/users?_q=example&role=admin" });
    const items = res.json<{ name: string }[]>();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe("Alice");
  });

  it("can be combined with _sort", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "GET",
      url: "/users?_q=example&_sort=name&_order=desc",
    });
    const items = res.json<{ name: string }[]>();
    expect(items).toHaveLength(2);
    expect(items[0]!.name).toBe("Ana");
    expect(items[1]!.name).toBe("Alice");
  });

  it("matches numeric fields converted to string", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    // id: 3 → searching "3" should match
    const res = await server.inject({ method: "GET", url: "/users?_q=3" });
    const items = res.json<{ id: number }[]>();
    expect(items.some((u) => u.id === 3)).toBe(true);
  });
});
