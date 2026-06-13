import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { yrestOptionsSchema } from "../../src/config/loadOptions";

const YAML_DB = `
users:
  - id: 1
    name: Alice
  - id: 2
    name: Bob
`;

async function createSnapshotServer() {
  const filePath = join(tmpdir(), `yrest-snapshot-${randomUUID()}.yml`);
  writeFileSync(filePath, YAML_DB, "utf8");
  const storage = createYrestStorage(filePath);
  const options = yrestOptionsSchema.parse({ file: filePath, snapshot: true });
  const server = await createServer(storage, options);
  return { server, storage, filePath };
}

describe("snapshot mode", () => {
  const files: string[] = [];
  afterEach(() => {
    files.splice(0).forEach((f) => {
      try {
        unlinkSync(f);
      } catch {
        /* already removed */
      }
    });
  });

  it("GET /_snapshot returns initial savedAt and collection counts", async () => {
    const { server, filePath } = await createSnapshotServer();
    files.push(filePath);
    const res = await server.inject({ method: "GET", url: "/_snapshot" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ savedAt: string; collections: Record<string, number> }>();
    expect(body.savedAt).toBeDefined();
    expect(new Date(body.savedAt).getTime()).not.toBeNaN();
    expect(body.collections["users"]).toBe(2);
  });

  it("POST /_snapshot/save captures current state", async () => {
    const { server, storage, filePath } = await createSnapshotServer();
    files.push(filePath);

    // Add a user directly via storage
    storage.setCollection("users", [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ]);

    const res = await server.inject({ method: "POST", url: "/_snapshot/save" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      message: string;
      savedAt: string;
      collections: Record<string, number>;
    }>();
    expect(body.message).toBe("Snapshot saved");
    expect(body.collections["users"]).toBe(3);
  });

  it("POST /_snapshot/reset restores to initial snapshot", async () => {
    const { server, filePath } = await createSnapshotServer();
    files.push(filePath);

    // Mutate state through the HTTP API
    await server.inject({
      method: "POST",
      url: "/users",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Charlie" }),
    });

    // Verify mutation took effect
    const beforeReset = await server.inject({ method: "GET", url: "/users" });
    expect(beforeReset.json<unknown[]>()).toHaveLength(3);

    // Reset to initial snapshot (2 users)
    const res = await server.inject({ method: "POST", url: "/_snapshot/reset" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ message: string; collections: Record<string, number> }>();
    expect(body.message).toBe("Database restored to snapshot");
    expect(body.collections["users"]).toBe(2);

    // Confirm in-memory state is restored
    const afterReset = await server.inject({ method: "GET", url: "/users" });
    expect(afterReset.json<unknown[]>()).toHaveLength(2);
  });

  it("POST /_snapshot/reset restores to manually saved snapshot", async () => {
    const { server, storage, filePath } = await createSnapshotServer();
    files.push(filePath);

    // Add a user and save snapshot at that point
    storage.setCollection("users", [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ]);
    await server.inject({ method: "POST", url: "/_snapshot/save" });

    // Delete a user
    await server.inject({ method: "DELETE", url: "/users/3" });
    const mid = await server.inject({ method: "GET", url: "/users" });
    expect(mid.json<unknown[]>()).toHaveLength(2);

    // Reset should bring back all 3
    await server.inject({ method: "POST", url: "/_snapshot/reset" });
    const afterReset = await server.inject({ method: "GET", url: "/users" });
    expect(afterReset.json<unknown[]>()).toHaveLength(3);
  });

  it("snapshot endpoints are NOT registered when snapshot option is false", async () => {
    const filePath = join(tmpdir(), `yrest-no-snapshot-${randomUUID()}.yml`);
    writeFileSync(filePath, YAML_DB, "utf8");
    files.push(filePath);
    const storage = createYrestStorage(filePath);
    const options = yrestOptionsSchema.parse({ file: filePath, snapshot: false });
    const server = await createServer(storage, options);

    const res = await server.inject({ method: "GET", url: "/_snapshot" });
    expect(res.statusCode).toBe(404);
  });
});
