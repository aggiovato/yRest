import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../../storage/types.js";
import type { RouteCommand } from "../types.js";

/**
 * Registers all custom routes declared under `_routes` in the YAML file.
 *
 * Each entry is mounted as a static Fastify route that returns the pre-defined
 * `response.body` and `response.status` regardless of the request content.
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
      const body = route.response?.body ?? null;
      const headers = route.response?.headers ?? {};

      server.route({
        method: method as Parameters<FastifyInstance["route"]>[0]["method"],
        url,
        handler: (_req, reply) => {
          for (const [key, value] of Object.entries(headers)) {
            reply.header(key, value);
          }
          if (body === null && status === 204) {
            return reply.status(status).send();
          }
          return reply.status(status).send(body);
        },
      });
    }
  }
}
