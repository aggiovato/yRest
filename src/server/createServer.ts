import Fastify from "fastify";
import cors from "@fastify/cors";
import type { YrestStorage } from "../storage/types.js";
import type { ServerOptions } from "../config/loadOptions.js";
import type { RouteCommand } from "../router/types.js";
import type { HandlerMap } from "../utils/handlers.js";
import { buildResourceRouteCommands } from "../router/resource.router.js";
import { AboutRouteCommand, CustomRouteCommand, SnapshotRouteCommand } from "../router/routes";

/** HTTP methods that modify server state. Used by the readonly guard hook. */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Creates and configures a Fastify instance wired to the given YAML storage.
 *
 * Registers, in order:
 * 1. CORS (all origins, permissive defaults).
 * 2. Readonly guard hook — rejects mutating requests with 405 when enabled.
 * 3. Delay hook — defers `onSend` by N ms when enabled.
 * 4. All route commands: about, snapshot (optional), custom routes, resource routes.
 *
 * The server is returned before `listen()` is called so tests can inject
 * requests without binding a real port.
 *
 * @param storage - Initialised YAML storage instance.
 * @param options - Validated server options.
 * @param handlers - Map of named handler functions loaded from yrest.handlers.js.
 */
export async function createServer(
  storage: YrestStorage,
  options: ServerOptions,
  handlers: HandlerMap = new Map()
) {
  const server = Fastify();

  await server.register(cors, {
    exposedHeaders: ["X-Total-Count"],
  });

  server.setErrorHandler((err: { statusCode?: number; message?: string }, _req, reply) => {
    const status = err.statusCode ?? 500;
    const message = status < 500 ? err.message || "Request error" : "Internal server error";
    reply.status(status).send({ error: message });
  });

  if (options.readonly) {
    server.addHook("onRequest", (_req, reply, done) => {
      if (MUTATING_METHODS.has(_req.method)) {
        reply
          .status(405)
          .header("Allow", "GET, HEAD, OPTIONS")
          .send({ error: "Server is running in readonly mode" });
      }
      // done() must be called even after reply.send() to advance the Fastify lifecycle.
      done();
    });
  }

  if (options.delay > 0) {
    server.addHook("onSend", (_req, _reply, payload, done) => {
      setTimeout(() => done(null, payload), options.delay);
    });
  }

  const commands: RouteCommand[] = [
    new AboutRouteCommand(storage, options, handlers),
    ...(options.snapshot ? [new SnapshotRouteCommand(storage)] : []),
    new CustomRouteCommand(storage, options.base, handlers),
    ...buildResourceRouteCommands(storage, options),
  ];

  for (const command of commands) {
    command.register(server);
  }

  return server;
}
