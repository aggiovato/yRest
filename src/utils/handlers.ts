import { existsSync } from "node:fs";
import type { ServerResponse } from "node:http";
import type { CollectionAccessor } from "../api/collection.js";

/** Incoming request data passed to every handler function. */
export type HandlerRequest = {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: unknown;
  headers: Record<string, string | string[]>;
};

/** Value returned by a handler function to describe the HTTP response. */
export type HandlerResponse = {
  /** HTTP status code. Defaults to `200` if omitted. */
  status?: number;
  /** Response body. Any JSON-serialisable value. */
  body?: unknown;
  /** Additional response headers to set on the reply. */
  headers?: Record<string, string>;
};

/**
 * Server context passed to every handler as its last argument.
 *
 * Gives handlers typed access to the live collections, so a mock can read and change the
 * same data the REST routes serve (e.g. a login handler that looks the user up).
 */
export type HandlerContext = {
  /** Returns a typed CRUD handle for a collection. Throws if the collection does not exist. */
  collection: CollectionAccessor;
};

/** A function that handles a custom route request and returns a response descriptor. */
export type Handler = (
  req: HandlerRequest,
  ctx: HandlerContext
) => HandlerResponse | Promise<HandlerResponse>;

/**
 * A function that takes full control of an SSE stream (`_sse: { _handler: name }`).
 *
 * yrest sets the SSE headers, flushes them and sends a keep-alive comment every 15 s.
 * The handler writes frames to `raw` and decides when to `raw.end()`. Listen to
 * `raw.on("close", ...)` to stop work when the client disconnects.
 */
export type SseHandler = (
  req: HandlerRequest,
  raw: ServerResponse,
  ctx: HandlerContext
) => void | Promise<void>;

/** Map of exported function name → handler function (HTTP or SSE). */
export type HandlerMap = Map<string, Handler | SseHandler>;

/**
 * Identity wrapper that types a custom route handler. It has no runtime effect.
 *
 * @example
 * ```ts
 * import { defineHandler } from "@yrest/cli";
 * import type { User } from "./db.types";
 *
 * export const login = defineHandler((req, { collection }) => {
 *   const { email } = (req.body ?? {}) as { email?: string };
 *   const user = collection<User>("users").findWhere((u) => u.email === email)[0];
 *   return user ? { body: { token: `tok-${user.id}` } } : { status: 401, body: { error: "Unknown user" } };
 * });
 * ```
 */
export function defineHandler(fn: Handler): Handler {
  return fn;
}

/**
 * Identity wrapper that types an SSE stream handler. It has no runtime effect.
 *
 * @example
 * ```ts
 * import { defineSseHandler } from "@yrest/cli";
 *
 * export const clock = defineSseHandler((req, raw) => {
 *   const timer = setInterval(() => {
 *     raw.write(`event: tick\ndata: ${JSON.stringify({ now: Date.now() })}\n\n`);
 *   }, 1000);
 *   raw.on("close", () => clearInterval(timer));
 * });
 * ```
 */
export function defineSseHandler(fn: SseHandler): SseHandler {
  return fn;
}

/**
 * Dynamically imports a JavaScript or TypeScript handler file and returns all exported
 * functions as a map.
 *
 * Only named exports that are functions are included. Non-function exports are silently ignored.
 * If the file does not exist, an empty map is returned without error.
 * If the import fails, the error is logged and an empty map is returned so the server still starts.
 *
 * @param filePath - Absolute path to the JavaScript handler file.
 * @returns A map of function name → handler for every exported function in the file.
 */
/**
 * Extensions `loadHandlers` will import. `.ts` / `.mts` rely on Node's built-in type stripping
 * (Node ≥ 22.18) or on running yrest through `tsx`; elsewhere their import fails and is logged.
 */
const ALLOWED_EXTENSIONS = [".js", ".mjs", ".cjs", ".ts", ".mts"];

export async function loadHandlers(filePath: string): Promise<HandlerMap> {
  if (!existsSync(filePath)) return new Map();

  if (!ALLOWED_EXTENSIONS.some((ext) => filePath.endsWith(ext))) {
    console.error(
      `  \x1b[31m[handlers] ${filePath} — only .js, .mjs, .cjs, .ts and .mts files are allowed\x1b[0m`
    );
    return new Map();
  }

  try {
    const mod = (await import(filePath)) as Record<string, unknown>;
    const map: HandlerMap = new Map();
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value === "function") map.set(name, value as Handler | SseHandler);
    }
    return map;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  \x1b[31m[handlers] failed to load ${filePath} — ${msg}\x1b[0m`);
    return new Map();
  }
}
