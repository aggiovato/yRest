import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../../storage/types.js";
import type { ServerOptions } from "../../config/loadOptions.js";
import type { RouteCommand } from "../types.js";
import { generateAboutHtml } from "../templates/about.template.js";

/**
 * Registers the `GET /_about` meta route.
 *
 * Returns an HTML overview page describing the running server: active modes,
 * all generated endpoints grouped by resource, supported query parameters,
 * and ready-to-run curl examples derived from the live YAML storage.
 *
 * The HTML is generated on every request so it always reflects the current
 * in-memory state (relevant in watch mode when data changes).
 */
export class AboutRouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YamlStorage,
    private readonly options: ServerOptions
  ) {}

  register(server: FastifyInstance): void {
    server.get("/_about", (_req, reply) => {
      reply.header("Content-Type", "text/html; charset=utf-8");
      return reply.send(generateAboutHtml(this.storage, this.options));
    });
  }
}
