import type { YrestStorage } from "../storage/types.js";
import type { YrestOptions } from "../config/loadOptions.js";
import type { RouteCommand } from "./types.js";
import { CollectionRouteCommand, ItemRouteCommand, NestedRouteCommand } from "./routes";

/**
 * Builds the full list of route commands for every collection in the YAML storage.
 *
 * For each collection, creates a {@link CollectionRouteCommand} (GET all, POST) and an
 * {@link ItemRouteCommand} (GET one, PUT, PATCH, DELETE) under `{base}/{collection}`.
 * Appends a single {@link NestedRouteCommand} that handles all `_rel`-derived nested routes.
 *
 * @param storage - Live YAML storage to read collections and relations from.
 * @param options - Resolved server options; `options.base` is used as the URL prefix.
 * @returns An ordered list of route commands ready to be registered on a Fastify instance.
 */
export function buildResourceRouteCommands(
  storage: YrestStorage,
  options: YrestOptions
): RouteCommand[] {
  const commands: RouteCommand[] = [];

  for (const resource of Object.keys(storage.getData())) {
    const resourceBase = `${options.base}/${resource}`;

    commands.push(new CollectionRouteCommand(storage, resource, resourceBase, options));
    commands.push(new ItemRouteCommand(storage, resource, resourceBase));
  }

  commands.push(new NestedRouteCommand(storage, storage.getRelations(), options.base));

  return commands;
}
