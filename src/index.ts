/**
 * Public API for `@yrest/cli`.
 *
 * Exposes the core building blocks to embed the mock server programmatically:
 * create a storage instance, pass it to `createServer`, and call `listen`.
 *
 * @example
 * import { createYrestStorage, createServer, yrestOptionsSchema } from "@yrest/cli";
 *
 * const storage = createYrestStorage("db.yml");
 * const options = yrestOptionsSchema.parse({ file: "db.yml", port: 3000 });
 * const server = await createServer(storage, options);
 * await server.listen({ port: options.port });
 */
export { createYrestStorage } from "./storage/yrestStorage.js";
export { createServer, createYrestServerFromStorage } from "./server/index.js";
export type { YrestServer } from "./server/index.js";
export { yrestOptionsSchema } from "./config/loadOptions.js";
export type { YrestOptions } from "./config/loadOptions.js";
export type { Data, Resource, Relations, CustomRoute, YrestStorage } from "./storage/types.js";
export type { HandlerRequest, HandlerResponse, Handler, HandlerMap } from "./utils/handlers.js";
