import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../storage/yamlStorage.js";
import type { Resource, Relations } from "../storage/types.js";
import type { ServerOptions } from "../config/loadOptions.js";

/** Fastify route params for item-level routes that include an `:id` segment. */
export type ItemParams = { Params: { id: string } };

/**
 * Fastify querystring type shared across all route handlers.
 * Values are `string` for single params and `string[]` when the same key is repeated
 * (e.g. `?_expand=author&_expand=category`).
 */
export type RouteQuery = { Querystring: Record<string, string | string[]> };

/**
 * A function that registers collection- or item-level routes for a single resource.
 *
 * @param server   - The Fastify instance to register routes on.
 * @param storage  - Live YAML storage shared across all route handlers.
 * @param resource - Collection name as declared in the YAML file (e.g. `"users"`).
 * @param base     - Full URL prefix for this resource (e.g. `/api/users`).
 * @param options  - Resolved server options (pagination config, readonly, delay, etc.).
 */
export type RoutePlugin = (
  server: FastifyInstance,
  storage: YamlStorage,
  resource: string,
  base: string,
  options: ServerOptions
) => void;

/**
 * A function that registers nested child routes derived from `_rel` declarations.
 *
 * @param server    - The Fastify instance to register routes on.
 * @param storage   - Live YAML storage shared across all route handlers.
 * @param relations - Relational mappings from the YAML `_rel` block.
 * @param base      - URL prefix under which nested routes are mounted (e.g. `/api`).
 */
export type NestedRoutePlugin = (
  server: FastifyInstance,
  storage: YamlStorage,
  relations: Relations,
  base: string
) => void;

/** Pagination metadata included in a {@link PagedResponse}. */
export interface Pagination {
  /** Current page number (1-based). */
  page: number;
  /** Maximum items per page. */
  limit: number;
  /** Total items in the filtered collection before pagination. */
  totalItems: number;
  /** Total number of pages: `Math.ceil(totalItems / limit)`. */
  totalPages: number;
  /** Whether the current page is the first page. */
  isFirst: boolean;
  /** Whether the current page is the last page. */
  isLast: boolean;
  /** Whether there is a page after the current one. */
  hasNext: boolean;
  /** Whether there is a page before the current one. */
  hasPrev: boolean;
}

/**
 * Envelope returned by GET collection routes when `pageable` mode is enabled.
 *
 * @example
 * // GET /users?_page=2
 * {
 *   "data": [{ "id": 11, "name": "..." }, ...],
 *   "pagination": { "page": 2, "limit": 10, "totalItems": 23, ... }
 * }
 */
export interface PagedResponse {
  data: Resource[];
  pagination: Pagination;
}
