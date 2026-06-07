import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../storage/yamlStorage.js";
import type { Relations } from "../storage/types.js";

/**
 * A function that registers collection- or item-level routes for a single resource.
 *
 * @param server   - The Fastify instance to register routes on.
 * @param storage  - Live YAML storage shared across all route handlers.
 * @param resource - Collection name as declared in the YAML file (e.g. `"users"`).
 * @param base     - Full URL prefix for this resource (e.g. `/api/users`).
 */
export type RoutePlugin = (
  server: FastifyInstance,
  storage: YamlStorage,
  resource: string,
  base: string
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
