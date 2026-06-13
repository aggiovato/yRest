import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { yrestOptionsSchema } from "../../src/config/loadOptions";
import { YAML_BASIC } from "./helpers";
import type { createServer as CreateServer } from "../../src/server/createServer";

describe("delay mode", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof CreateServer>>;

  beforeEach(async () => {
    filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    writeFileSync(filePath, YAML_BASIC, "utf8");
    const storage = createYrestStorage(filePath);
    const options = yrestOptionsSchema.parse({ file: filePath, delay: 200 });
    server = await createServer(storage, options);
  });

  afterEach(async () => {
    await server.close();
    unlinkSync(filePath);
  });

  it("responds successfully after the delay", async () => {
    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.statusCode).toBe(200);
  });

  it("takes at least the configured delay to respond", async () => {
    const start = Date.now();
    await server.inject({ method: "GET", url: "/users" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(190);
  });

  it("returns correct data after delay", async () => {
    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.json()).toHaveLength(2);
  });

  it("applies delay to write operations too", async () => {
    const start = Date.now();
    await server.inject({ method: "POST", url: "/users", payload: { name: "Test" } });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(190);
  });
});

describe("no delay (default)", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof CreateServer>>;

  beforeEach(async () => {
    filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    writeFileSync(filePath, YAML_BASIC, "utf8");
    const storage = createYrestStorage(filePath);
    const options = yrestOptionsSchema.parse({ file: filePath });
    server = await createServer(storage, options);
  });

  afterEach(async () => {
    await server.close();
    unlinkSync(filePath);
  });

  it("responds normally with no delay configured", async () => {
    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });
});
