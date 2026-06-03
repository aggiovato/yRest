import Fastify from "fastify";
import cors from "@fastify/cors";
import type { YamlStorage } from "../storage/yamlStorage.js";
import type { ServerOptions } from "../config/loadOptions.js";
import { registerResourceRoutes } from "../router/resourceRouter.js";

export async function createServer(
  storage: YamlStorage,
  options: ServerOptions
) {
  const server = Fastify();

  await server.register(cors);

  registerResourceRoutes(server, storage, options.base);

  return server;
}
