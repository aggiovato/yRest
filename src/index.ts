/**
 * Public API for `@yrest/cli`.
 *
 * ## Programmatic use
 *
 * Start a mock server from inline YAML data or a `db.yml` file without touching the CLI.
 * Designed for Vitest, Playwright, Cypress, and any integration test setup.
 *
 * @example — inline data with the `yrest` template literal
 * ```ts
 * import { createYrestServer, yrest } from "@yrest/cli";
 *
 * const server = createYrestServer({
 *   data: yrest`
 *     users:
 *       - id: 1
 *         name: Ana
 *   `,
 *   port: 0,        // random port — no conflicts between parallel tests
 *   readonly: true,
 * });
 *
 * beforeAll(() => server.start());
 * afterAll(() => server.stop());
 *
 * it("returns users", async () => {
 *   const res = await fetch(`${server.url}/users`);
 *   expect(await res.json()).toHaveLength(1);
 * });
 * ```
 *
 * @example — file-based (e.g. Playwright globalSetup)
 * ```ts
 * import { createYrestServer } from "@yrest/cli";
 *
 * const server = createYrestServer({ file: "./tests/db.yml", port: 3070 });
 * await server.start();
 * // → http://localhost:3070
 * await server.stop();
 * ```
 *
 * ## Low-level building blocks
 *
 * For advanced use: compose storage + options + server manually.
 *
 * ```ts
 * import { createYrestStorage, createYrestServerFromStorage, yrestOptionsSchema } from "@yrest/cli";
 *
 * const storage = createYrestStorage("db.yml");
 * const options = yrestOptionsSchema.parse({ file: "db.yml", port: 3000 });
 * const server = createYrestServerFromStorage(storage, options);
 * await server.start();
 * ```
 */

// ─── Programmatic API ─────────────────────────────────────────────────────────
export { yrest } from "./api/yrest.js";
export { createYrestServer } from "./api/yrestServer.js";
export type { YrestServer, YrestServerOptions, YrestServerBaseOptions } from "./api/yrestServer.js";

// ─── Low-level building blocks ────────────────────────────────────────────────
export { createYrestStorage } from "./storage/yrestStorage.js";
export { createServer, createYrestServerFromStorage } from "./server/index.js";
export { yrestOptionsSchema } from "./config/loadOptions.js";
export type { YrestOptions } from "./config/loadOptions.js";
export type { Data, Resource, Relations, CustomRoute, YrestStorage } from "./storage/types.js";
export type { HandlerRequest, HandlerResponse, Handler, HandlerMap } from "./utils/handlers.js";
