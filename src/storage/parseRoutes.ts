import type { CustomRoute, RouteResponse, Scenario } from "./types.js";

/**
 * Normalises a raw `_routes` block from the YAML file into canonical {@link CustomRoute} objects.
 *
 * All yrest-reserved keys inside a route entry use the `_` prefix in YAML:
 * `_method`, `_path`, `_handler`, `_response`, `_scenarios`, `_otherwise`,
 * `_delay`, `_error`, `_errorBody`.
 *
 * Response blocks (`_response`, `_otherwise`) use `_status`, `_body`, `_headers`.
 * Scenario entries use `_when` and `_response`.
 *
 * Unknown or malformed entries are silently skipped.
 */
export function parseRoutes(raw: unknown): CustomRoute[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normaliseRoute).filter((r): r is CustomRoute => r !== null);
}

function normaliseRoute(raw: unknown): CustomRoute | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;

  const method = v["_method"];
  if (typeof method === "string" && method.toUpperCase() === "SSE") return null;
  if ("_sse" in v) return null;
  const path = v["_path"];
  if (typeof method !== "string" || typeof path !== "string") return null;

  const route: CustomRoute = { method, path };

  if (typeof v["_handler"] === "string") route.handler = v["_handler"];
  if (typeof v["_delay"] === "number") route.delay = v["_delay"];
  if (typeof v["_error"] === "number") route.error = v["_error"];
  if (v["_errorBody"] !== undefined) route.errorBody = v["_errorBody"];

  const response = normaliseResponse(v["_response"]);
  if (response) route.response = response;

  const otherwise = normaliseResponse(v["_otherwise"]);
  if (otherwise) route.otherwise = otherwise;

  const scenarios = normaliseScenarios(v["_scenarios"]);
  if (scenarios.length > 0) route.scenarios = scenarios;

  return route;
}

function normaliseResponse(raw: unknown): RouteResponse | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const v = raw as Record<string, unknown>;
  const response: RouteResponse = {};

  if (typeof v["_status"] === "number") response.status = v["_status"];
  if (v["_body"] !== undefined) response.body = v["_body"];
  if (v["_headers"] && typeof v["_headers"] === "object" && !Array.isArray(v["_headers"]))
    response.headers = v["_headers"] as Record<string, string>;

  return Object.keys(response).length > 0 ? response : undefined;
}

function normaliseScenarios(raw: unknown): Scenario[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normaliseScenario).filter((s): s is Scenario => s !== null);
}

function normaliseScenario(raw: unknown): Scenario | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;

  const when = v["_when"];
  if (!when || typeof when !== "object") return null;

  const response = normaliseResponse(v["_response"]);
  if (!response) return null;

  return { when: when as Record<string, unknown> | Record<string, unknown>[], response };
}
