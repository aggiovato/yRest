import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYamlStorage } from "../../src/storage/yamlStorage";
import { createServer } from "../../src/server/createServer";
import { serverOptionsSchema } from "../../src/config/loadOptions";

const YAML_DB = `
products:
  - id: 1
    name: Apple
    price: 10
    status: active
    email: apple@fruit.com
  - id: 2
    name: Banana
    price: 25
    status: inactive
    email: banana@fruit.com
  - id: 3
    name: Avocado
    price: 50
    status: active
    email: avocado@veggie.com
  - id: 4
    name: Blueberry
    price: 100
    status: active
    email: blue@gmail.com
`;

async function makeServer() {
  const filePath = join(tmpdir(), `yrest-operators-${randomUUID()}.yml`);
  writeFileSync(filePath, YAML_DB, "utf8");
  const storage = createYamlStorage(filePath);
  const options = serverOptionsSchema.parse({ file: filePath });
  const server = await createServer(storage, options);
  return { server, filePath };
}

describe("field operators", () => {
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

  // ── _gte ────────────────────────────────────────────────────────────────────

  it("_gte returns items with field >= value", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?price_gte=50" });
    expect(res.statusCode).toBe(200);
    const items = res.json<{ price: number }[]>();
    expect(items.every((p) => p.price >= 50)).toBe(true);
    expect(items).toHaveLength(2);
  });

  // ── _lte ────────────────────────────────────────────────────────────────────

  it("_lte returns items with field <= value", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?price_lte=25" });
    expect(res.statusCode).toBe(200);
    const items = res.json<{ price: number }[]>();
    expect(items.every((p) => p.price <= 25)).toBe(true);
    expect(items).toHaveLength(2);
  });

  it("_gte and _lte combined return a range", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?price_gte=20&price_lte=60" });
    const items = res.json<{ price: number }[]>();
    expect(items.every((p) => p.price >= 20 && p.price <= 60)).toBe(true);
    expect(items).toHaveLength(2);
  });

  // ── _ne ─────────────────────────────────────────────────────────────────────

  it("_ne excludes items where field equals value", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?status_ne=inactive" });
    const items = res.json<{ status: string }[]>();
    expect(items.every((p) => p.status !== "inactive")).toBe(true);
    expect(items).toHaveLength(3);
  });

  // ── _like ───────────────────────────────────────────────────────────────────

  it("_like matches case-insensitive substring", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?name_like=a" });
    const items = res.json<{ name: string }[]>();
    expect(items.every((p) => p.name.toLowerCase().includes("a"))).toBe(true);
    expect(items).toHaveLength(3);
  });

  it("_like is case-insensitive", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?name_like=APPLE" });
    const items = res.json<{ name: string }[]>();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe("Apple");
  });

  // ── _start ──────────────────────────────────────────────────────────────────

  it("_start matches items whose field starts with value", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?name_start=A" });
    const items = res.json<{ name: string }[]>();
    expect(items.every((p) => p.name.toLowerCase().startsWith("a"))).toBe(true);
    expect(items).toHaveLength(2);
  });

  it("_start is case-insensitive", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?name_start=av" });
    const items = res.json<{ name: string }[]>();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe("Avocado");
  });

  // ── _regex ──────────────────────────────────────────────────────────────────

  it("_regex matches against a regular expression", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?email_regex=gmail" });
    const items = res.json<{ email: string }[]>();
    expect(items).toHaveLength(1);
    expect(items[0]!.email).toBe("blue@gmail.com");
  });

  it("_regex with anchors works correctly", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?email_regex=^apple" });
    const items = res.json<{ email: string }[]>();
    expect(items).toHaveLength(1);
    expect(items[0]!.email).toBe("apple@fruit.com");
  });

  it("_regex with invalid pattern returns no results without crashing", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/products?email_regex=[invalid" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(0);
  });

  // ── combined ─────────────────────────────────────────────────────────────────

  it("operators can be combined with exact field filters", async () => {
    const { server, filePath } = await makeServer();
    files.push(filePath);
    const res = await server.inject({
      method: "GET",
      url: "/products?status=active&price_gte=50",
    });
    const items = res.json<{ status: string; price: number }[]>();
    expect(items.every((p) => p.status === "active" && p.price >= 50)).toBe(true);
    expect(items).toHaveLength(2);
  });
});
