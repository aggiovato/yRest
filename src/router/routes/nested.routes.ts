import type { NestedRoutePlugin } from "../types.js";
import { findById } from "../../services/resourceService.js";

/**
 * Registers nested routes derived from the `_rel` block in the YAML file.
 *
 * For each declared relation, registers:
 * GET /{parent}/:id/{child} — Returns all child items whose foreign key matches the parent id.
 *                             Returns 404 if the parent item does not exist.
 *
 * Example — given `_rel: { posts: { userId: users } }`:
 *   GET /users/1/posts → all posts where userId === "1"
 */
export const registerNestedRoutes: NestedRoutePlugin = (server, storage, relations, base) => {
  for (const [child, fields] of Object.entries(relations)) {
    for (const [field, parent] of Object.entries(fields)) {
      server.get<{ Params: { id: string } }>(`${base}/${parent}/:id/${child}`, (req, reply) => {
        const parentCollection = storage.getCollection(parent) ?? [];
        const parentItem = findById(parentCollection, req.params.id);
        if (!parentItem) return reply.status(404).send({ error: "Not found" });

        const children = (storage.getCollection(child) ?? []).filter(
          (item) => String(item[field]) === req.params.id
        );
        return children;
      });
    }
  }
};
