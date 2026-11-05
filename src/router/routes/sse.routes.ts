import type { FastifyInstance } from "fastify";
import type { ServerResponse } from "node:http";
import type { YrestStorage } from "../../storage/types.js";
import type { RouteCommand } from "../types.js";
import type {
  HandlerContext,
  HandlerMap,
  HandlerRequest,
  SseHandler,
} from "../../utils/handlers.js";
import { interpolate, hasTemplates } from "../../utils/interpolate.js";
import { collectionAccessor } from "../../api/collection.js";

type SseGeneric = {
  Params: Record<string, string>;
  Querystring: Record<string, string | string[]>;
};

/**
 * Registers GET routes for every SSE stream declared under `_routes` with an `_sse` block.
 *
 * Each route hijacks the Fastify response and writes SSE frames directly to the raw
 * Node.js socket. Frames are emitted at `_interval` ms; a keep-alive comment is sent
 * every 15 s to prevent proxy timeouts. The stream closes when `_loop: false` or after
 * `_repeat` full cycles complete.
 *
 * When the route declares `_sse: { _handler: name }`, the named {@link SseHandler} drives the
 * stream instead: yrest sends the headers and keep-alives, the handler writes frames and ends
 * the response. A missing handler answers `501` before the stream opens; a handler that
 * throws gets an `event: error` frame and the stream is closed.
 */
export class SSERouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YrestStorage,
    private readonly base: string,
    private readonly handlers: HandlerMap = new Map(),
    private readonly idStrategy: "increment" | "uuid" = "increment"
  ) {}

  register(server: FastifyInstance): void {
    const handlerCtx: HandlerContext = {
      collection: collectionAccessor(this.storage, this.idStrategy),
    };

    for (const route of this.storage.getSseRoutes()) {
      const url = `${this.base}${route.path}`;

      server.route<SseGeneric>({
        method: "GET",
        url,
        handler: async (req, reply) => {
          if (route.handler) {
            const fn = this.handlers.get(route.handler) as SseHandler | undefined;
            if (!fn) {
              return reply
                .status(501)
                .send({ error: `Handler "${route.handler}" is not defined in the handlers file` });
            }
            reply.hijack();
            const raw = reply.raw;
            openStream(raw);

            const keepAlive = setInterval(() => {
              if (!raw.writableEnded) raw.write(": ping\n\n");
            }, 15_000);
            raw.on("close", () => clearInterval(keepAlive));

            const ctx: HandlerRequest = {
              params: req.params,
              query: req.query,
              body: null,
              headers: req.headers as Record<string, string | string[]>,
            };
            try {
              await fn(ctx, raw, handlerCtx);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              clearInterval(keepAlive);
              if (!raw.writableEnded) {
                raw.write(
                  `event: error\ndata: ${JSON.stringify({ error: `Handler "${route.handler}" threw an error: ${msg}` })}\n\n`
                );
                raw.end();
              }
            }
            return;
          }

          reply.hijack();
          const raw = reply.raw;
          openStream(raw);

          let alive = true;
          req.raw.on("close", () => {
            alive = false;
          });

          const keepAlive = setInterval(() => {
            if (alive) raw.write(": ping\n\n");
          }, 15_000);

          let frameIndex = 0;
          let cycleCount = 0;

          function sendNext() {
            if (!alive) {
              clearInterval(keepAlive);
              return;
            }

            const ev = route.events[frameIndex];
            const ctx = {
              params: req.params,
              query: req.query,
              body: null,
              headers: req.headers as Record<string, string | string[]>,
            };

            const data = hasTemplates(ev.data) ? interpolate(ev.data, ctx) : ev.data;

            let chunk = "";
            if (ev.event) chunk += `event: ${ev.event}\n`;
            chunk += `data: ${JSON.stringify(data)}\n\n`;
            raw.write(chunk);

            frameIndex++;

            if (frameIndex >= route.events.length) {
              frameIndex = 0;
              cycleCount++;

              const done =
                !route.loop || (route.repeat !== undefined && cycleCount >= route.repeat);

              if (done) {
                clearInterval(keepAlive);
                raw.end();
                return;
              }
            }

            if (alive) {
              setTimeout(sendNext, route.interval);
            }
          }

          sendNext();
        },
      });
    }
  }
}

/** Writes the SSE response headers and flushes them so the client sees the stream open. */
function openStream(raw: ServerResponse): void {
  raw.setHeader("Content-Type", "text/event-stream");
  raw.setHeader("Cache-Control", "no-cache");
  raw.setHeader("Connection", "keep-alive");
  raw.setHeader("Access-Control-Allow-Origin", "*");
  raw.flushHeaders();
}
