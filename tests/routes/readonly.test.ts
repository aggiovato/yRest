import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { serverOptionsSchema } from "../../src/config/loadOptions";
import { YAML_BASIC } from "./helpers";
import type { createServer as CreateServer } from "../../src/server/createServer";

describe("readonly mode", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof CreateServer>>;

  beforeEach(async () => {
    filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
    writeFileSync(filePath, YAML_BASIC, "utf8");
    const storage = createYrestStorage(filePath);
    const options = serverOptionsSchema.parse({ file: filePath, readonly: true });
    server = await createServer(storage, options);
  });

  afterEach(async () => {
    await server.close();
    unlinkSync(filePath);
  });

  it("allows GET requests", async () => {
    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.statusCode).toBe(200);
  });

  it("blocks POST with 405", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/users",
      payload: { name: "Carlos" },
    });
    expect(res.statusCode).toBe(405);
  });

  it("blocks PUT with 405", async () => {
    const res = await server.inject({
      method: "PUT",
      url: "/users/1",
      payload: { name: "X" },
    });
    expect(res.statusCode).toBe(405);
  });

  it("blocks PATCH with 405", async () => {
    const res = await server.inject({
      method: "PATCH",
      url: "/users/1",
      payload: { name: "X" },
    });
    expect(res.statusCode).toBe(405);
  });

  it("blocks DELETE with 405", async () => {
    const res = await server.inject({ method: "DELETE", url: "/users/1" });
    expect(res.statusCode).toBe(405);
  });

  it("response includes Allow header with safe methods", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/users",
      payload: { name: "X" },
    });
    expect(res.headers["allow"]).toBe("GET, HEAD, OPTIONS");
  });

  it("data is not modified after blocked write", async () => {
    await server.inject({ method: "POST", url: "/users", payload: { name: "Carlos" } });
    const res = await server.inject({ method: "GET", url: "/users" });
    expect(res.json()).toHaveLength(2);
  });
});
