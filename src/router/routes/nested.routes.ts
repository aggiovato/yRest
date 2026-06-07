import type { NestedRoutePlugin, ItemParams, NestedItemParams } from "../types.js";
import { findById } from "../../services/resourceService.js";

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
export const registerNestedRoutes: NestedRoutePlugin = (server, storage, relations, base) => {
  for (const [child, fields] of Object.entries(relations)) {
    for (const [field, parent] of Object.entries(fields)) {
      const collectionPath = `${base}/${parent}/:id/${child}`;
      const itemPath = `${base}/${parent}/:id/${child}/:childId`;

      server.get<ItemParams>(collectionPath, (req, reply) => {
        const parentCollection = storage.getCollection(parent) ?? [];
        const parentItem = findById(parentCollection, req.params.id);
        if (!parentItem) return reply.status(404).send({ error: "Not found" });

        const children = (storage.getCollection(child) ?? []).filter(
          (item) => String(item[field]) === req.params.id
        );
        return children;
      });

      server.get<NestedItemParams>(itemPath, (req, reply) => {
        const parentCollection = storage.getCollection(parent) ?? [];
        const parentItem = findById(parentCollection, req.params.id);
        if (!parentItem) return reply.status(404).send({ error: "Not found" });

        const childItem = (storage.getCollection(child) ?? []).find(
          (item) =>
            String(item[field]) === req.params.id && String(item["id"]) === req.params.childId
        );
        if (!childItem) return reply.status(404).send({ error: "Not found" });

        return childItem;
      });
    }
  }
};
