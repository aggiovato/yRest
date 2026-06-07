import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../../storage/yamlStorage.js";

/**
 * Registers the `/_snapshot` meta routes.
 *
 * All three routes operate outside the configured `base` so they are always
 * reachable at a predictable URL regardless of server configuration.
 *
 * GET  /_snapshot        — Returns metadata about the current snapshot.
 * POST /_snapshot/save   — Replaces the snapshot with the current database state.
 * POST /_snapshot/reset  — Restores the database to the last saved snapshot.
 *
 * @param server  - The Fastify instance to register routes on.
 * @param storage - Live YAML storage that owns the snapshot state.
 */
export function registerSnapshotRoutes(server: FastifyInstance, storage: YamlStorage): void {
  server.get("/_snapshot", (_req, reply) => {
    const { data, savedAt } = storage.getSnapshot();
    return reply.send({
      savedAt: savedAt.toISOString(),
      collections: Object.fromEntries(
        Object.entries(data).map(([name, items]) => [name, items.length])
      ),
    });
  });

  server.post("/_snapshot/save", (_req, reply) => {
    storage.saveSnapshot();
    const { data, savedAt } = storage.getSnapshot();
    return reply.send({
      message: "Snapshot saved",
      savedAt: savedAt.toISOString(),
      collections: Object.fromEntries(
        Object.entries(data).map(([name, items]) => [name, items.length])
      ),
    });
  });

  server.post("/_snapshot/reset", (_req, reply) => {
    storage.resetToSnapshot();
    const { data, savedAt } = storage.getSnapshot();
    return reply.send({
      message: "Database restored to snapshot",
      savedAt: savedAt.toISOString(),
      collections: Object.fromEntries(
        Object.entries(data).map(([name, items]) => [name, items.length])
      ),
    });
  });
}
