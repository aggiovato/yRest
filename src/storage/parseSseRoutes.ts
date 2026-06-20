import type { SseEvent, SseRoute } from "./types.js";

/**
 * Extracts SSE stream routes from a raw `_routes` array.
 *
 * An entry is treated as an SSE route when it has a `_sse` block.
 * Entries without `_sse` are handled by `parseRoutes` instead.
 */
export function parseSseRoutes(raw: unknown): SseRoute[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normaliseSseRoute).filter((r): r is SseRoute => r !== null);
}

function normaliseSseRoute(raw: unknown): SseRoute | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;

  const method = typeof v["_method"] === "string" ? v["_method"].toUpperCase() : null;
  const path = v["_path"];
  const sse = v["_sse"];

  if (method !== "SSE") return null;
  if (typeof path !== "string" || !sse || typeof sse !== "object" || Array.isArray(sse)) {
    return null;
  }

  const s = sse as Record<string, unknown>;
  const rawEvents = s["_events"];
  if (!Array.isArray(rawEvents)) return null;

  const events: SseEvent[] = rawEvents.map(normaliseEvent).filter((e): e is SseEvent => e !== null);

  if (!events.length) return null;

  return {
    path,
    interval: typeof s["_interval"] === "number" ? s["_interval"] : 1000,
    loop: s["_loop"] !== false,
    repeat: typeof s["_repeat"] === "number" ? s["_repeat"] : undefined,
    events,
  };
}

function normaliseEvent(raw: unknown): SseEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  if (!("_data" in v)) return null;

  const event: SseEvent = { data: v["_data"] };
  if (typeof v["_event"] === "string") event.event = v["_event"];
  return event;
}
