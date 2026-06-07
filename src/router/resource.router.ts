import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../storage/yamlStorage.js";
import { registerCollectionRoutes } from "./routes/collection.routes.js";
import { registerItemRoutes } from "./routes/item.routes.js";
import { registerNestedRoutes } from "./routes/nested.routes.js";

/**
 * Registers all REST routes for every collection defined in the YAML storage.
 *
 * For each collection, mounts collection-level routes (GET all, POST) and
 * item-level routes (GET one, PUT, PATCH, DELETE) under `{base}/{collection}`.
 * Nested routes from `_rel` declarations are mounted under `base`.
 *
 * @param server  - The Fastify instance to register routes on.
 * @param storage - Live YAML storage to read collections and relations from.
 * @param base    - URL prefix for all routes (e.g. `/api` or `""`).
 */
export function registerResourceRoutes(
  server: FastifyInstance,
  storage: YamlStorage,
  base: string
): void {
  for (const resource of Object.keys(storage.getData())) {
    const resourceBase = `${base}/${resource}`;
    registerCollectionRoutes(server, storage, resource, resourceBase);
    registerItemRoutes(server, storage, resource, resourceBase);
  }

  registerNestedRoutes(server, storage, storage.getRelations(), base);
}
