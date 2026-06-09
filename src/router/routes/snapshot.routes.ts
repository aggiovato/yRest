import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../../storage/types.js";
import type { RouteCommand } from "../types.js";

/**
 * Registers the `/_snapshot` meta routes.
 *
 * All three routes operate outside the configured `base` so they are always
 * reachable at a predictable URL regardless of server configuration.
 *
 * GET  /_snapshot        — Returns metadata about the current snapshot.
 * POST /_snapshot/save   — Replaces the snapshot with the current database state.
 * POST /_snapshot/reset  — Restores the database to the last saved snapshot.
 */
export class SnapshotRouteCommand implements RouteCommand {
  constructor(private readonly storage: YamlStorage) {}

  register(server: FastifyInstance): void {
    server.get("/_snapshot", (_req, reply) => {
      const { data, savedAt } = this.storage.getSnapshot();
      return reply.send({
        savedAt: savedAt.toISOString(),
        collections: Object.fromEntries(
          Object.entries(data).map(([name, items]) => [name, items.length])
        ),
      });
    });

    server.post("/_snapshot/save", (_req, reply) => {
      this.storage.saveSnapshot();
      const { data, savedAt } = this.storage.getSnapshot();
      return reply.send({
        message: "Snapshot saved",
        savedAt: savedAt.toISOString(),
        collections: Object.fromEntries(
          Object.entries(data).map(([name, items]) => [name, items.length])
        ),
      });
    });

    server.post("/_snapshot/reset", (_req, reply) => {
      this.storage.resetToSnapshot();
      const { data, savedAt } = this.storage.getSnapshot();
      return reply.send({
        message: "Database restored to snapshot",
        savedAt: savedAt.toISOString(),
        collections: Object.fromEntries(
          Object.entries(data).map(([name, items]) => [name, items.length])
        ),
      });
    });
  }
}
