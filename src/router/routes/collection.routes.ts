import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../../storage/yamlStorage.js";
import type { Resource } from "../../storage/types.js";
import { createItem, filterByQuery, paginate } from "../../services/resourceService.js";

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
  server.get<{ Querystring: Record<string, string> }>(prefix, (req, reply) => {
    const collection = storage.getCollection(resource) ?? [];
    const filtered = filterByQuery(collection, req.query);

    const rawPage = req.query["_page"];
    const rawLimit = req.query["_limit"];
    if (!rawPage && !rawLimit) return filtered;

    const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
    const limit = Math.max(1, parseInt(rawLimit ?? "10", 10) || 10);
    reply.header("X-Total-Count", String(filtered.length));
    return paginate(filtered, page, limit);
  });

  server.post<{ Body: Resource }>(prefix, (req, reply) => {
    const item = createItem(storage, resource, req.body as Resource);
    return reply.status(201).send(item);
  });
}
