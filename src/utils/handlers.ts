import { existsSync } from "node:fs";

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

/** A function that handles a custom route request and returns a response descriptor. */
export type Handler = (req: HandlerRequest) => HandlerResponse | Promise<HandlerResponse>;

/** Map of exported function name → handler function. */
export type HandlerMap = Map<string, Handler>;

/**
 * Dynamically imports a JavaScript handler file and returns all exported functions as a map.
 *
 * Only named exports that are functions are included. Non-function exports are silently ignored.
 * If the file does not exist, an empty map is returned without error.
 * If the import fails, the error is logged and an empty map is returned so the server still starts.
 *
 * @param filePath - Absolute path to the JavaScript handler file.
 * @returns A map of function name → handler for every exported function in the file.
 */
export async function loadHandlers(filePath: string): Promise<HandlerMap> {
  if (!existsSync(filePath)) return new Map();

  try {
    const mod = (await import(filePath)) as Record<string, unknown>;
    const map: HandlerMap = new Map();
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value === "function") map.set(name, value as Handler);
    }
    return map;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  \x1b[31m[handlers] failed to load ${filePath} — ${msg}\x1b[0m`);
    return new Map();
  }
}
