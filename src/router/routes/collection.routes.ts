import type { FastifyInstance } from "fastify";
import type { YrestStorage } from "../../storage/types.js";
import type { YrestOptions } from "../../config/loadOptions.js";
import type { Resource } from "../../storage/types.js";
import type { RouteCommand, RouteQuery, Pagination, PagedResponse } from "../types.js";
import { firstParam } from "../../utils/params.js";
import {
  filterByQuery,
  fullTextSearch,
  sortBy,
  paginate,
  projectFields,
} from "../../services/query.service.js";
import { createItem } from "../../services/resource.service.js";
import { expandItems, embedItems } from "../../services/expand.service.js";

/**
 * Registers collection-level routes for a given resource.
 *
 * GET  /{resource}   — Returns all items. Supports `?_sort`, `?_order`, `?_page`, `?_limit`,
 *                      `?_expand`, `?_embed`, `?_fields`, `?_q` and field filters. When
 *                      `pageable` mode is enabled the response is wrapped in `{ data, pagination }`.
 * POST /{resource}   — Creates a new item. Auto-assigns an incremental id if none is provided.
 *                      Persists the change to the YAML file. Returns 201 with the created item.
 */
export class CollectionRouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YrestStorage,
    private readonly resource: string,
    private readonly base: string,
    private readonly options: YrestOptions
  ) {}

  register(server: FastifyInstance): void {
    // GET /{resource}
    server.get<RouteQuery>(this.base, (req, reply) => {
      const collection = this.storage.getCollection(this.resource) ?? [];
      const filtered = filterByQuery(collection, req.query);
      const searchTerm = firstParam(req.query["_q"]);
      const searched = searchTerm ? fullTextSearch(filtered, searchTerm) : filtered;
      const fields = (firstParam(req.query["_fields"]) ?? "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const sortField = firstParam(req.query["_sort"]);
      const sortOrder = firstParam(req.query["_order"]) === "desc" ? "desc" : "asc";
      const sorted = sortField ? sortBy(searched, sortField, sortOrder) : searched;

      if (this.options.pageable.enabled) {
        const defaultLimit = this.options.pageable.limit;
        const page = Math.max(1, parseInt(firstParam(req.query["_page"]) ?? "1", 10) || 1);
        const limit = Math.max(
          1,
          parseInt(firstParam(req.query["_limit"]) ?? String(defaultLimit), 10) || defaultLimit
        );
        const totalItems = sorted.length;
        const totalPages = Math.ceil(totalItems / limit) || 1;

        const data = projectFields(
          embedItems(
            expandItems(paginate(sorted, page, limit), req.query, this.resource, this.storage),
            req.query,
            this.resource,
            this.storage
          ),
          fields
        );

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
        // X-Total-Count reflects the filtered total, not the paginated slice,
        // so clients can calculate the total number of pages without a separate request.
        reply.header("X-Total-Count", String(sorted.length));
        result = paginate(sorted, page, limit);
      }

      return projectFields(
        embedItems(
          expandItems(result, req.query, this.resource, this.storage),
          req.query,
          this.resource,
          this.storage
        ),
        fields
      );
    });

    // POST /{resource}
    server.post<RouteQuery & { Body: Resource }>(this.base, (req, reply) => {
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return reply.status(400).send({ error: "Request body must be a JSON object" });
      }
      const item = createItem(this.storage, this.resource, req.body as Resource);
      return reply.status(201).send(expandItems(item, req.query, this.resource, this.storage));
    });
  }
}
