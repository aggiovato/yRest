import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../storage/yamlStorage.js";
import { registerCollectionRoutes } from "./routes/collection.routes.js";
import { registerItemRoutes } from "./routes/item.routes.js";
import { registerNestedRoutes } from "./routes/nested.routes.js";

/**
 * Registers all REST routes for every collection defined in the YAML file,
 * plus any nested routes declared via `_rel`.
 *
 * For each collection: collection-level (GET all, POST) and item-level
 * (GET one, PUT, PATCH, DELETE) routes are registered under the given base path.
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
