import type { FastifyInstance } from "fastify";
import type { Resource } from "../storage/types.js";

/** Fastify route params for item-level routes that include an `:id` segment. */
export type ItemParams = { Params: { id: string } };

/** Fastify route params for nested item routes — parent `:id` and child `:childId`. */
export type NestedItemParams = { Params: { id: string; childId: string } };

/**
 * Fastify querystring type shared across all route handlers.
 * Values are `string` for single params and `string[]` when the same key is repeated
 * (e.g. `?_expand=author&_expand=category`).
 */
export type RouteQuery = { Querystring: Record<string, string | string[]> };

/**
 * A route registration command.
 *
 * Each command captures its own dependencies in the constructor and exposes
 * a single `register` method. The caller iterates over a uniform array of
 * commands without needing to know each command's specific parameter set.
 *
 * @example
 * const commands: RouteCommand[] = [
 *   new AboutRouteCommand(storage, options),
 *   new CollectionRouteCommand(storage, "users", "/users", options),
 * ];
 * for (const cmd of commands) cmd.register(server);
 */
export interface RouteCommand {
  register(server: FastifyInstance): void;
}

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
