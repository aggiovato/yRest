import Fastify from "fastify";
import cors from "@fastify/cors";
import type { YamlStorage } from "../storage/yamlStorage.js";
import type { ServerOptions } from "../config/loadOptions.js";
import { registerResourceRoutes } from "../router/resource.router.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
      done();
    });
  }

  registerResourceRoutes(server, storage, options.base);

  return server;
}
