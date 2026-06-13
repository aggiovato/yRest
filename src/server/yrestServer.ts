import type { YrestStorage } from "../storage/types.js";
import type { YrestOptions } from "../config/loadOptions.js";
import type { HandlerMap } from "../utils/handlers.js";
import { createServer } from "./createServer.js";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Handle returned by {@link createYrestServerFromStorage} and {@link createYrestServer}. */
export interface YrestServer {
  /** Starts the server and begins listening on the configured port. */
  start(): Promise<void>;
  /** Gracefully closes the server. */
  stop(): Promise<void>;
  /** The port the server is listening on. Only valid after `start()`. */
  readonly port: number;
  /** The base URL of the server (e.g. `http://localhost:3070`). Only valid after `start()`. */
  readonly url: string;
}

// ─── Shared core ─────────────────────────────────────────────────────────────

/**
 * Creates a {@link YrestServer} from an already-initialised storage and parsed options.
 *
 * This is the shared Fastify lifecycle owner used by both the CLI (`serve` command)
 * and the programmatic API (`createYrestServer`). It is the only place where
 * `createServer → listen → close` lives.
 *
 * Each consumer is responsible for building storage and resolving options before
 * calling this function:
 * - CLI (`serve.ts`): Zod parsing, config-file merging, `process.exit` error handling
 * - Programmatic API (`createYrestServer`): raw → parsed options conversion, inline data support
 *
 * @param storage  - Initialised storage instance (file-based or in-memory).
 * @param options  - Fully resolved and validated server options.
 * @param handlers - Pre-loaded handler map. Defaults to an empty map.
 */
export function createYrestServerFromStorage(
  storage: YrestStorage,
  options: YrestOptions,
  handlers: HandlerMap = new Map()
): YrestServer {
  let _port = 0;
  let _started = false;
  let _fastify: Awaited<ReturnType<typeof createServer>> | null = null;

  return {
    async start() {
      if (_started) return;
      _fastify = await createServer(storage, options, handlers);
      await _fastify.listen({ port: options.port, host: options.host });
      const address = _fastify.addresses()[0];
      _port = typeof address === "object" && "port" in address ? address.port : options.port;
      _started = true;
    },

    async stop() {
      if (!_started || !_fastify) return;
      await _fastify.close();
      _started = false;
    },

    get port() {
      return _port;
    },

    get url() {
      return `http://${options.host}:${_port}${options.base}`;
    },
  };
}
