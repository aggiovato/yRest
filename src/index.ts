/**
 * Public API for `@aggiovato/yrest`.
 *
 * Exposes the core building blocks to embed the mock server programmatically:
 * create a storage instance, pass it to `createServer`, and call `listen`.
 *
 * @example
 * import { createYamlStorage, createServer, serverOptionsSchema } from "@aggiovato/yrest";
 *
 * const storage = createYamlStorage("db.yml");
 * const options = serverOptionsSchema.parse({ file: "db.yml", port: 3000 });
 * const server = await createServer(storage, options);
 * await server.listen({ port: options.port });
 */
export { createYamlStorage } from "./storage/yamlStorage.js";
export { createServer } from "./server/createServer.js";
export { serverOptionsSchema } from "./config/loadOptions.js";
export type { ServerOptions } from "./config/loadOptions.js";
export type { Data, Resource, Relations, CustomRoute, YamlStorage } from "./storage/types.js";
export type { HandlerRequest, HandlerResponse, Handler, HandlerMap } from "./utils/handlers.js";
