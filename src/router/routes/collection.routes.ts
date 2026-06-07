import type { Resource } from "../../storage/types.js";
import type { RoutePlugin, RouteQuery, Pagination, PagedResponse } from "../types.js";
import { firstParam } from "../../utils/params.js";
import { filterByQuery, sortBy, paginate } from "../../services/query.service.js";
import { createItem } from "../../services/resource.service.js";
import { expandItems } from "../../services/expand.service.js";

/**
 * Registers collection-level routes for a given resource.
 *
 * GET  /{resource}   — Returns all items. Supports `?_sort`, `?_order`, `?_page`, `?_limit`,
 *                      `?_expand`, and field filters. When `pageable` mode is enabled the response
 *                      is wrapped in `{ data, pagination }` and `?_page`/`?_limit` query params
 *                      use the server default limit. Without `pageable`, raw arrays are returned
 *                      and `X-Total-Count` is set when `?_page` or `?_limit` are present.
 * POST /{resource}   — Creates a new item. Auto-assigns an incremental id if none is provided.
 *                      Persists the change to the YAML file. Returns 201 with the created item.
 */
export const registerCollectionRoutes: RoutePlugin = (server, storage, resource, base, options) => {
  // GET /{resource}
  server.get<RouteQuery>(base, (req, reply) => {
    const collection = storage.getCollection(resource) ?? [];
    const filtered = filterByQuery(collection, req.query);

    const sortField = firstParam(req.query["_sort"]);
    const sortOrder = firstParam(req.query["_order"]) === "desc" ? "desc" : "asc";
    const sorted = sortField ? sortBy(filtered, sortField, sortOrder) : filtered;

    if (options.pageable.enabled) {
      const defaultLimit = options.pageable.limit;
      const page = Math.max(1, parseInt(firstParam(req.query["_page"]) ?? "1", 10) || 1);
      const limit = Math.max(
        1,
        parseInt(firstParam(req.query["_limit"]) ?? String(defaultLimit), 10) || defaultLimit
      );
      const totalItems = sorted.length;
      const totalPages = Math.ceil(totalItems / limit) || 1;

      const data = expandItems(paginate(sorted, page, limit), req.query, resource, storage);

      const pagination: Pagination = {
        page,
        limit,
        totalItems,
        totalPages,
        isFirst: page === 1,
        isLast: page >= totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return reply.send({ data, pagination } satisfies PagedResponse);
    }

    const rawPage = firstParam(req.query["_page"]);
    const rawLimit = firstParam(req.query["_limit"]);

    let result: Resource[];
    if (!rawPage && !rawLimit) {
      result = sorted;
    } else {
      const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
      const limit = Math.max(1, parseInt(rawLimit ?? "10", 10) || 10);
      reply.header("X-Total-Count", String(sorted.length));
      result = paginate(sorted, page, limit);
    }

    return expandItems(result, req.query, resource, storage);
  });

  // POST /{resource}
  server.post<RouteQuery & { Body: Resource }>(base, (req, reply) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return reply.status(400).send({ error: "Request body must be a JSON object" });
    }
    const item = createItem(storage, resource, req.body as Resource);
    return reply.status(201).send(expandItems(item, req.query, resource, storage));
  });
};
