import type { FastifyInstance } from "fastify";
import type { YrestStorage } from "../../storage/types.js";
import type { YrestOptions } from "../../config/loadOptions.js";
import type { RouteCommand } from "../types.js";
import { generateOpenApi } from "../../openapi/generateOpenApi.js";
import { stringify } from "yaml";

/**
 * Registers the OpenAPI spec endpoints.
 *
 * - `GET /_openapi`      — returns the spec as YAML (`text/yaml`)
 * - `GET /_openapi.json` — returns the spec as JSON (`application/json`)
 *
 * The spec is generated on every request so it always reflects the current
 * storage state (relevant in watch mode when the YAML file changes).
 */
export class OpenApiRouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YrestStorage,
    private readonly options: YrestOptions
  ) {}

  register(server: FastifyInstance): void {
    server.get("/_openapi", (_req, reply) => {
      const doc = generateOpenApi(this.storage, this.options);
      reply.header("Content-Type", "text/yaml; charset=utf-8");
      return reply.send(stringify(doc, { lineWidth: 0, aliasDuplicateObjects: false }));
    });

    server.get("/_openapi.json", (_req, reply) => {
      return reply.send(generateOpenApi(this.storage, this.options));
    });
  }
}
