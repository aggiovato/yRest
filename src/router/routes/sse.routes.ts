import type { FastifyInstance } from "fastify";
import type { YrestStorage } from "../../storage/types.js";
import type { RouteCommand } from "../types.js";
import { interpolate, hasTemplates } from "../../utils/interpolate.js";

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
 */
export class SSERouteCommand implements RouteCommand {
  constructor(
    private readonly storage: YrestStorage,
    private readonly base: string
  ) {}

  register(server: FastifyInstance): void {
    for (const route of this.storage.getSseRoutes()) {
      const url = `${this.base}${route.path}`;

      server.route<SseGeneric>({
        method: "GET",
        url,
        handler: async (req, reply) => {
          reply.hijack();
          const raw = reply.raw;
          raw.setHeader("Content-Type", "text/event-stream");
          raw.setHeader("Cache-Control", "no-cache");
          raw.setHeader("Connection", "keep-alive");
          raw.setHeader("Access-Control-Allow-Origin", "*");
          raw.flushHeaders();

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
