import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../../storage/yamlStorage.js";
import type { Resource } from "../../storage/types.js";
import { createItem } from "../../services/resourceService.js";

/**
 * Registers collection-level routes for a given resource.
 *
 * GET  /{resource}   — Returns all items in the collection.
 * POST /{resource}   — Creates a new item. Auto-assigns an incremental id if none is provided.
 *                      Persists the change to the YAML file. Returns 201 with the created item.
 */
export function registerCollectionRoutes(
  server: FastifyInstance,
  storage: YamlStorage,
  resource: string,
  prefix: string
): void {
  server.get(prefix, () => storage.getCollection(resource) ?? []);

  server.post<{ Body: Resource }>(prefix, (req, reply) => {
    const item = createItem(storage, resource, req.body as Resource);
    return reply.status(201).send(item);
  });
}
