import type { Resource } from "../../storage/types.js";
import type { RoutePlugin } from "../types.js";
import { createItem, filterByQuery, sortBy, paginate } from "../../services/resourceService.js";

/**
 * Registers collection-level routes for a given resource.
 *
 * GET  /{resource}   — Returns all items in the collection.
 * POST /{resource}   — Creates a new item. Auto-assigns an incremental id if none is provided.
 *                      Persists the change to the YAML file. Returns 201 with the created item.
 */
export const registerCollectionRoutes: RoutePlugin = (server, storage, resource, base) => {
  server.get<{ Querystring: Record<string, string> }>(base, (req, reply) => {
    // Retrieve the collection from storage, or use an empty array if it doesn't exist
    const collection = storage.getCollection(resource) ?? [];

    // Filter the collection by query params
    const filtered = filterByQuery(collection, req.query);

    // Sort the filtered collection by query params
    const sortField = req.query["_sort"];
    const sortOrder = req.query["_order"] === "desc" ? "desc" : "asc";
    const sorted = sortField ? sortBy(filtered, sortField, sortOrder) : filtered;

    // Paginate the sorted collection by query params
    const rawPage = req.query["_page"];
    const rawLimit = req.query["_limit"];
    if (!rawPage && !rawLimit) return sorted;

    const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
    const limit = Math.max(1, parseInt(rawLimit ?? "10", 10) || 10);

    // Add X-Total-Count header with the filtered count before pagination
    reply.header("X-Total-Count", String(sorted.length));

    // Return the paginated collection
    return paginate(sorted, page, limit);
  });

  server.post<{ Body: Resource }>(base, (req, reply) => {
    const item = createItem(storage, resource, req.body as Resource);
    return reply.status(201).send(item);
  });
};
