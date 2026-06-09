import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../../storage/types.js";
import type { RouteCommand } from "../types.js";
import { interpolate, hasTemplates } from "../../utils/interpolate.js";

type CustomRouteGeneric = {
  Params: Record<string, string>;
  Querystring: Record<string, string | string[]>;
  Body: unknown;
};

/**
 * Registers all custom routes declared under `_routes` in the YAML file.
 *
 * Each entry is mounted as a Fastify route that returns the pre-defined response.
 * If the response body contains `{{variable}}` placeholders they are resolved
 * against the incoming request at handler time (params, query, body, headers,
 * `{{now}}`, `{{uuid}}`). Routes without placeholders are fully static.
 *
 * Custom routes are registered before resource routes so they take priority.
 */
export class CustomRouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YamlStorage,
    private readonly base: string
  ) {}

  register(server: FastifyInstance): void {
    for (const route of this.storage.getRoutes()) {
      const method = route.method?.toUpperCase();
      const path = route.path;

      if (!method || !path) continue;

      const url = `${this.base}${path}`;
      const status = route.response?.status ?? 200;
      const rawBody = route.response?.body ?? null;
      const headers = route.response?.headers ?? {};
      const dynamic = rawBody !== null && hasTemplates(rawBody);

      server.route<CustomRouteGeneric>({
        method: method as Parameters<FastifyInstance["route"]>[0]["method"],
        url,
        handler: (req, reply) => {
          for (const [key, value] of Object.entries(headers)) {
            reply.header(key, value);
          }

          const body = dynamic
            ? interpolate(rawBody, {
                params: req.params,
                query: req.query,
                body: req.body,
                headers: req.headers as Record<string, string | string[]>,
              })
            : rawBody;

          if (body === null && status === 204) return reply.status(status).send();
          return reply.status(status).send(body);
        },
      });
    }
  }
}
