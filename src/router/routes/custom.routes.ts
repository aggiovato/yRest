import type { FastifyInstance } from "fastify";
import type { YrestStorage } from "../../storage/types.js";
import type { RouteCommand } from "../types.js";
import type { HandlerMap, HandlerRequest } from "../../utils/handlers.js";
import { interpolate, hasTemplates } from "../../utils/interpolate.js";
import { findMatchingScenario } from "../../utils/conditions.js";

function resolveBody(body: unknown, ctx: HandlerRequest): unknown {
  if (body != null && hasTemplates(body)) return interpolate(body, ctx);
  return body ?? null;
}

type CustomRouteGeneric = {
  Params: Record<string, string>;
  Querystring: Record<string, string | string[]>;
  Body: unknown;
};

/**
 * Registers all custom routes declared under `_routes` in the YAML file.
 *
 * Resolution priority per request:
 * 1. `handler` name found in the handler map → calls the function, uses its return value.
 * 2. `handler` name missing from the map → 501 with an informative error.
 * 3. First matching `scenario` → returns scenario response (supports `{{}}` templates).
 * 4. `otherwise` block → explicit fallback when scenarios are defined but none matched.
 * 5. Static or template `response` block (final fallback).
 *
 * Custom routes are registered before resource routes so they always take priority.
 */
export class CustomRouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YrestStorage,
    private readonly base: string,
    private readonly handlers: HandlerMap = new Map()
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
      const handlerName = route.handler;

      server.route<CustomRouteGeneric>({
        method: method as Parameters<FastifyInstance["route"]>[0]["method"],
        url,
        handler: async (req, reply) => {
          if (route.delay && route.delay > 0) {
            await new Promise<void>((resolve) => setTimeout(resolve, route.delay));
          }

          if (route.error) {
            const body = route.errorBody ?? { error: `Forced error ${route.error}` };
            return reply.status(route.error).send(body);
          }

          for (const [key, value] of Object.entries(headers)) {
            reply.header(key, value);
          }

          if (handlerName) {
            const fn = this.handlers.get(handlerName);
            if (!fn) {
              return reply
                .status(501)
                .send({ error: `Handler "${handlerName}" is not defined in the handlers file` });
            }
            try {
              const ctx: HandlerRequest = {
                params: req.params,
                query: req.query,
                body: req.body,
                headers: req.headers as Record<string, string | string[]>,
              };
              const result = await fn(ctx);
              const resStatus = result.status ?? 200;
              for (const [k, v] of Object.entries(result.headers ?? {})) {
                reply.header(k, v);
              }
              if (!result.body && resStatus === 204) return reply.status(resStatus).send();
              return reply.status(resStatus).send(result.body ?? null);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return reply
                .status(500)
                .send({ error: `Handler "${handlerName}" threw an error: ${msg}` });
            }
          }

          // No handler defined, so we check for scenarios or fallback to the static/template response.
          const ctx: HandlerRequest = {
            params: req.params,
            query: req.query,
            body: req.body,
            headers: req.headers as Record<string, string | string[]>,
          };

          if (route.scenarios?.length) {
            const matched = findMatchingScenario(route.scenarios, ctx);

            const active = matched?.response ?? route.otherwise;
            if (active) {
              const aStatus = active.status ?? 200;
              const aBody = resolveBody(active.body, ctx);
              for (const [k, v] of Object.entries(active.headers ?? {})) reply.header(k, v);
              if (!active.body && aStatus === 204) return reply.status(aStatus).send();
              return reply.status(aStatus).send(aBody);
            }
          }

          const body = dynamic ? interpolate(rawBody, ctx) : rawBody;
          if (body === null && status === 204) return reply.status(status).send();
          return reply.status(status).send(body);
        },
      });
    }
  }
}
