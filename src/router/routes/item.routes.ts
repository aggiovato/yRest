import type { Resource } from "../../storage/types.js";
import type { RoutePlugin, ItemParams, RouteQuery } from "../types.js";
import {
  findById,
  replaceItem,
  patchItem,
  deleteItem,
  expandItems,
} from "../../services/resourceService.js";

/**
 * Registers item-level routes for a given resource.
 *
 * All routes support `?_expand=<relation>` to embed a related parent object in the response.
 *
 * GET    /{resource}/:id — Returns a single item by id. Returns 404 if not found.
 * PUT    /{resource}/:id — Fully replaces an item. The id is preserved regardless of the body.
 *                          Persists the change. Returns 404 if the id does not exist.
 * PATCH  /{resource}/:id — Partially updates an item, merging only the provided fields.
 *                          Persists the change. Returns 404 if the id does not exist.
 * DELETE /{resource}/:id — Removes an item and returns it as confirmation.
 *                          Persists the change. Returns 404 if the id does not exist.
 */
export const registerItemRoutes: RoutePlugin = (server, storage, resource, base) => {
  server.get<ItemParams & RouteQuery>(`${base}/:id`, (req, reply) => {
    const item = findById(storage.getCollection(resource) ?? [], req.params.id);
    if (!item) return reply.status(404).send({ error: "Not found" });
    return expandItems(item, req.query, resource, storage);
  });

  server.put<ItemParams & RouteQuery & { Body: Resource }>(`${base}/:id`, (req, reply) => {
    const item = replaceItem(storage, resource, req.params.id, req.body as Resource);
    if (!item) return reply.status(404).send({ error: "Not found" });
    return expandItems(item, req.query, resource, storage);
  });

  server.patch<ItemParams & RouteQuery & { Body: Resource }>(`${base}/:id`, (req, reply) => {
    const item = patchItem(storage, resource, req.params.id, req.body as Resource);
    if (!item) return reply.status(404).send({ error: "Not found" });
    return expandItems(item, req.query, resource, storage);
  });

  server.delete<ItemParams & RouteQuery>(`${base}/:id`, (req, reply) => {
    const item = deleteItem(storage, resource, req.params.id);
    if (!item) return reply.status(404).send({ error: "Not found" });
    return expandItems(item, req.query, resource, storage);
  });
};
