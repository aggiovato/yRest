import type { FastifyInstance } from "fastify";
import type { YrestStorage } from "../../storage/types.js";
import type { Resource } from "../../storage/types.js";
import type { RouteCommand, ItemParams, RouteQuery } from "../types.js";
import { findById, replaceItem, patchItem, deleteItem } from "../../services/resource.service.js";
import { expandItems, embedItems } from "../../services/expand.service.js";
import { projectFields } from "../../services/query.service.js";

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
export class ItemRouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YrestStorage,
    private readonly resource: string,
    private readonly base: string
  ) {}

  register(server: FastifyInstance): void {
    // GET /{resource}/:id
    server.get<ItemParams & RouteQuery>(`${this.base}/:id`, (req, reply) => {
      const item = findById(this.storage.getCollection(this.resource) ?? [], req.params.id);
      if (!item) return reply.status(404).send({ error: "Not found" });
      const fields = ((req.query["_fields"] as string | undefined) ?? "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      return projectFields(
        embedItems(
          expandItems(item, req.query, this.resource, this.storage),
          req.query,
          this.resource,
          this.storage
        ),
        fields
      );
    });

    // PUT /{resource}/:id
    server.put<ItemParams & RouteQuery & { Body: Resource }>(`${this.base}/:id`, (req, reply) => {
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return reply.status(400).send({ error: "Request body must be a JSON object" });
      }
      const item = replaceItem(this.storage, this.resource, req.params.id, req.body as Resource);
      if (!item) return reply.status(404).send({ error: "Not found" });
      return expandItems(item, req.query, this.resource, this.storage);
    });

    // PATCH /{resource}/:id
    server.patch<ItemParams & RouteQuery & { Body: Resource }>(`${this.base}/:id`, (req, reply) => {
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return reply.status(400).send({ error: "Request body must be a JSON object" });
      }
      const item = patchItem(this.storage, this.resource, req.params.id, req.body as Resource);
      if (!item) return reply.status(404).send({ error: "Not found" });
      return expandItems(item, req.query, this.resource, this.storage);
    });

    // DELETE /{resource}/:id
    server.delete<ItemParams & RouteQuery>(`${this.base}/:id`, (req, reply) => {
      const item = deleteItem(this.storage, this.resource, req.params.id);
      if (!item) return reply.status(404).send({ error: "Not found" });
      return expandItems(item, req.query, this.resource, this.storage);
    });
  }
}
