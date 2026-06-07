import type { Resource } from "../../storage/types.js";
import type { RoutePlugin, ItemParams, RouteQuery } from "../types.js";
import { findById, replaceItem, patchItem, deleteItem } from "../../services/resource.service.js";
import { expandItems } from "../../services/expand.service.js";

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
  // GET /{resource}/:id
  server.get<ItemParams & RouteQuery>(`${base}/:id`, (req, reply) => {
    const item = findById(storage.getCollection(resource) ?? [], req.params.id);
    if (!item) return reply.status(404).send({ error: "Not found" });
    return expandItems(item, req.query, resource, storage);
  });

  // PUT /{resource}/:id
  server.put<ItemParams & RouteQuery & { Body: Resource }>(`${base}/:id`, (req, reply) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return reply.status(400).send({ error: "Request body must be a JSON object" });
    }
    const item = replaceItem(storage, resource, req.params.id, req.body as Resource);
    if (!item) return reply.status(404).send({ error: "Not found" });
    return expandItems(item, req.query, resource, storage);
  });

  // PATCH /{resource}/:id
  server.patch<ItemParams & RouteQuery & { Body: Resource }>(`${base}/:id`, (req, reply) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return reply.status(400).send({ error: "Request body must be a JSON object" });
    }
    const item = patchItem(storage, resource, req.params.id, req.body as Resource);
    if (!item) return reply.status(404).send({ error: "Not found" });
    return expandItems(item, req.query, resource, storage);
  });

  // DELETE /{resource}/:id
  server.delete<ItemParams & RouteQuery>(`${base}/:id`, (req, reply) => {
    const item = deleteItem(storage, resource, req.params.id);
    if (!item) return reply.status(404).send({ error: "Not found" });
    return expandItems(item, req.query, resource, storage);
  });
};
