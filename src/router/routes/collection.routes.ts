import type { Resource } from "../../storage/types.js";
import type { RoutePlugin, RouteQuery } from "../types.js";
import {
  createItem,
  filterByQuery,
  sortBy,
  paginate,
  expandItems,
} from "../../services/resourceService.js";

/**
 * Registers collection-level routes for a given resource.
 *
 * GET  /{resource}   — Returns all items in the collection.
 * POST /{resource}   — Creates a new item. Auto-assigns an incremental id if none is provided.
 *                      Persists the change to the YAML file. Returns 201 with the created item.
 */
export const registerCollectionRoutes: RoutePlugin = (server, storage, resource, base) => {
  server.get<RouteQuery>(base, (req, reply) => {
    const collection = storage.getCollection(resource) ?? [];
    const filtered = filterByQuery(collection, req.query);

    const sortField = req.query["_sort"];
    const sortOrder = req.query["_order"] === "desc" ? "desc" : "asc";
    const sorted = sortField ? sortBy(filtered, sortField, sortOrder) : filtered;

    const rawPage = req.query["_page"];
    const rawLimit = req.query["_limit"];

    let result: Resource[];
    if (!rawPage && !rawLimit) {
      result = sorted;
    } else {
      const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
      const limit = Math.max(1, parseInt(rawLimit ?? "10", 10) || 10);
      // Reflects the filtered total before pagination so clients can compute page counts.
      reply.header("X-Total-Count", String(sorted.length));
      result = paginate(sorted, page, limit);
    }

    return expandItems(result, req.query, resource, storage);
  });

  server.post<RouteQuery & { Body: Resource }>(base, (req, reply) => {
    const item = createItem(storage, resource, req.body as Resource);
    return reply.status(201).send(expandItems(item, req.query, resource, storage));
  });
};
