import type { FastifyInstance } from "fastify";
import type { YrestStorage } from "../../storage/types.js";
import type { Relations } from "../../storage/types.js";
import type { RouteCommand, ItemParams, NestedItemParams } from "../types.js";
import { findById } from "../../services/resource.service.js";

/**
 * Registers nested routes derived from the `_rel` block in the YAML file.
 *
 * For each declared relation, registers:
 * GET /{parent}/:id/{child}          — Returns all child items whose FK matches the parent id.
 *                                      Returns 404 if the parent does not exist.
 * GET /{parent}/:id/{child}/:childId — Returns a single child by id scoped to the parent.
 *                                      Returns 404 if the parent or the child does not exist
 *                                      or does not belong to that parent.
 *
 * Example — given `_rel: { posts: { userId: users } }`:
 *   GET /users/1/posts   → all posts where userId === "1"
 *   GET /users/1/posts/2 → post with id 2 only if userId === "1"
 */
export class NestedRouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YrestStorage,
    private readonly relations: Relations,
    private readonly base: string
  ) {}

  register(server: FastifyInstance): void {
    for (const [child, fields] of Object.entries(this.relations)) {
      for (const [field, parent] of Object.entries(fields)) {
        const collectionPath = `${this.base}/${parent}/:id/${child}`;
        const itemPath = `${this.base}/${parent}/:id/${child}/:childId`;

        // GET /{parent}/:id/{child}
        server.get<ItemParams>(collectionPath, (req, reply) => {
          const parentCollection = this.storage.getCollection(parent) ?? [];
          const parentItem = findById(parentCollection, req.params.id);
          if (!parentItem) return reply.status(404).send({ error: "Not found" });

          const children = (this.storage.getCollection(child) ?? []).filter(
            (item) => String(item[field]) === req.params.id
          );
          return children;
        });

        // GET /{parent}/:id/{child}/:childId
        server.get<NestedItemParams>(itemPath, (req, reply) => {
          const parentCollection = this.storage.getCollection(parent) ?? [];
          const parentItem = findById(parentCollection, req.params.id);
          if (!parentItem) return reply.status(404).send({ error: "Not found" });

          const childItem = (this.storage.getCollection(child) ?? []).find(
            (item) =>
              String(item[field]) === req.params.id && String(item["id"]) === req.params.childId
          );
          if (!childItem) return reply.status(404).send({ error: "Not found" });

          return childItem;
        });
      }
    }
  }
}
