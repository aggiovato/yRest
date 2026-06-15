import type { FastifyInstance } from "fastify";
import type { YrestStorage, Relations } from "../../storage/types.js";
import type { RouteCommand, ItemParams, NestedItemParams } from "../types.js";
import { findById } from "../../services/resource.service.js";

/**
 * Registers nested routes derived from the `_rel` block in the YAML file.
 *
 * ### many2one / one2one
 * GET /{parent}/:id/{child}          — Returns all children (many2one) or single object (one2one)
 *                                      whose FK matches the parent id. 404 if parent missing.
 * GET /{parent}/:id/{child}/:childId — Returns a single child scoped to the parent (many2one only).
 *
 * ### many2many
 * GET /{source}/:id/{alias}          — Returns all target items linked via the pivot collection.
 *                                      404 if source item missing.
 *
 * @example
 * // _rel: { posts: { userId: users } }
 * // GET /users/1/posts   → all posts where userId === "1"
 * // GET /users/1/posts/2 → post 2 only if userId === "1"
 *
 * @example
 * // _rel: { posts: { tags: { type: many2many, through: post_tags, foreignKey: postId, otherKey: tagId } } }
 * // GET /posts/1/tags → all tags linked to post 1 via post_tags
 */
export class NestedRouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YrestStorage,
    private readonly relations: Relations,
    private readonly base: string
  ) {}

  register(server: FastifyInstance): void {
    const registered = new Set<string>();

    for (const [source, fields] of Object.entries(this.relations)) {
      for (const [key, def] of Object.entries(fields)) {
        if (def.type === "many2many") {
          const fwd = `${this.base}/${source}/:id/${key}`;
          const inv = `${this.base}/${def.target}/:id/${source}`;
          if (!registered.has(fwd) && !registered.has(inv)) {
            registered.add(fwd);
            registered.add(inv);
            this.registerMany2Many(server, source, key, def);
          }
        } else {
          const collPath = `${this.base}/${def.target}/:id/${source}`;
          if (!registered.has(collPath)) {
            registered.add(collPath);
            this.registerFkRelation(server, source, key, def.target, def.type);
          }
        }
      }
    }
  }

  private registerFkRelation(
    server: FastifyInstance,
    child: string,
    fkField: string,
    parent: string,
    type: "many2one" | "one2one"
  ): void {
    const collectionPath = `${this.base}/${parent}/:id/${child}`;
    const itemPath = `${this.base}/${parent}/:id/${child}/:childId`;

    // GET /{parent}/:id/{child}
    server.get<ItemParams>(collectionPath, (req, reply) => {
      const parentCollection = this.storage.getCollection(parent) ?? [];
      const parentItem = findById(parentCollection, req.params.id);
      if (!parentItem) return reply.status(404).send({ error: "Not found" });

      const all = (this.storage.getCollection(child) ?? []).filter(
        (item) => String(item[fkField]) === req.params.id
      );

      if (type === "one2one") return all[0] ?? reply.status(404).send({ error: "Not found" });
      return all;
    });

    // GET /{parent}/:id/{child}/:childId  (many2one only — one2one has no sub-id route)
    if (type === "many2one") {
      server.get<NestedItemParams>(itemPath, (req, reply) => {
        const parentCollection = this.storage.getCollection(parent) ?? [];
        const parentItem = findById(parentCollection, req.params.id);
        if (!parentItem) return reply.status(404).send({ error: "Not found" });

        const childItem = (this.storage.getCollection(child) ?? []).find(
          (item) =>
            String(item[fkField]) === req.params.id && String(item["id"]) === req.params.childId
        );
        if (!childItem) return reply.status(404).send({ error: "Not found" });

        return childItem;
      });
    }
  }

  private registerMany2Many(
    server: FastifyInstance,
    source: string,
    alias: string,
    def: {
      type: "many2many";
      target: string;
      through: string;
      foreignKey: string;
      otherKey: string;
    }
  ): void {
    // GET /{source}/:id/{alias}  e.g. GET /posts/1/tags
    server.get<ItemParams>(`${this.base}/${source}/:id/${alias}`, (req, reply) => {
      const sourceCollection = this.storage.getCollection(source) ?? [];
      const sourceItem = findById(sourceCollection, req.params.id);
      if (!sourceItem) return reply.status(404).send({ error: "Not found" });

      const pivot = this.storage.getCollection(def.through) ?? [];
      const matchingIds = new Set(
        pivot
          .filter((row) => String(row[def.foreignKey]) === req.params.id)
          .map((row) => String(row[def.otherKey]))
      );

      return (this.storage.getCollection(def.target) ?? []).filter((t) =>
        matchingIds.has(String(t["id"]))
      );
    });

    // GET /{target}/:id/{source}  e.g. GET /tags/1/posts  (inverse)
    server.get<ItemParams>(`${this.base}/${def.target}/:id/${source}`, (req, reply) => {
      const targetCollection = this.storage.getCollection(def.target) ?? [];
      const targetItem = findById(targetCollection, req.params.id);
      if (!targetItem) return reply.status(404).send({ error: "Not found" });

      const pivot = this.storage.getCollection(def.through) ?? [];
      const matchingIds = new Set(
        pivot
          .filter((row) => String(row[def.otherKey]) === req.params.id)
          .map((row) => String(row[def.foreignKey]))
      );

      return (this.storage.getCollection(source) ?? []).filter((t) =>
        matchingIds.has(String(t["id"]))
      );
    });
  }
}
