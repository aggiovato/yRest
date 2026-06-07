import Fastify from "fastify";
import cors from "@fastify/cors";
import type { YamlStorage } from "../storage/yamlStorage.js";
import type { ServerOptions } from "../config/loadOptions.js";
import { registerResourceRoutes } from "../router/resource.router.js";

/** HTTP methods that modify server state. Used by the readonly guard hook. */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Creates and configures a Fastify instance wired to the given YAML storage.
 *
 * Registers, in order:
 * 1. CORS (all origins, permissive defaults).
 * 2. Readonly guard hook — rejects mutating requests with 405 when enabled.
 * 3. Delay hook — defers `onSend` by N ms when enabled.
 * 4. All resource routes derived from the storage collections.
 *
 * The server is returned before `listen()` is called so tests can inject
 * requests without binding a real port.
 *
 * @param storage - Initialised YAML storage instance.
 * @param options - Validated server options.
 */
export async function createServer(storage: YamlStorage, options: ServerOptions) {
  const server = Fastify();

  await server.register(cors);

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

  registerResourceRoutes(server, storage, options.base);

  return server;
}
