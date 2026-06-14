import type { Relations, CustomRoute } from "../storage/types.js";
import type { PathItem, Operation, Parameter, SchemaObject, ApiResponse } from "./types.js";

// ─── Shared query parameters for GET collection endpoints ─────────────────────

const COLLECTION_QUERY_PARAMS: Parameter[] = [
  { name: "_page", in: "query", schema: { type: "integer" }, description: "Page number (1-based)" },
  { name: "_limit", in: "query", schema: { type: "integer" }, description: "Items per page" },
  { name: "_sort", in: "query", schema: { type: "string" }, description: "Field name to sort by" },
  {
    name: "_order",
    in: "query",
    schema: { type: "string", enum: ["asc", "desc"] },
    description: "Sort direction",
  },
  {
    name: "_q",
    in: "query",
    schema: { type: "string" },
    description: "Full-text search across all scalar fields (case-insensitive)",
  },
  {
    name: "_expand",
    in: "query",
    schema: { type: "string" },
    description: "Embed related parent object inline (e.g. ?_expand=user)",
  },
  {
    name: "_embed",
    in: "query",
    schema: { type: "string" },
    description: "Embed child collection into each item (e.g. ?_embed=posts)",
  },
  {
    name: "_fields",
    in: "query",
    schema: { type: "string" },
    description: "Comma-separated field projection (e.g. ?_fields=id,name)",
  },
];

const ID_PATH_PARAM: Parameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Item id",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converts Fastify-style `:param` segments to OpenAPI `{param}` style. */
function toOpenApiPath(fastifyPath: string): string {
  return fastifyPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
}

/** Extracts path param names from a Fastify-style path. */
function extractPathParams(fastifyPath: string): Parameter[] {
  const matches = fastifyPath.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? [];
  return matches.map((m) => ({
    name: m.slice(1),
    in: "path" as const,
    required: true,
    schema: { type: "string" },
  }));
}

function singular(name: string): string {
  return name.endsWith("s") ? name.slice(0, -1) : name;
}

function schemaRef(name: string): SchemaObject {
  return { $ref: `#/components/schemas/${name}` };
}

function jsonContent(schema: SchemaObject): Record<string, { schema: SchemaObject }> {
  return { "application/json": { schema } };
}

function ok(schema: SchemaObject, description = "OK"): ApiResponse {
  return { description, content: jsonContent(schema) };
}

// ─── CRUD paths ───────────────────────────────────────────────────────────────

export function buildCrudPaths(
  collection: string,
  base: string,
  schemaName: string
): Record<string, PathItem> {
  const ref = schemaRef(schemaName);
  const tag = collection;
  const sing = singular(collection);
  const collPath = `${base}/${collection}`;
  const itemPath = `${base}/${collection}/{id}`;

  return {
    [collPath]: {
      get: {
        summary: `List ${collection}`,
        tags: [tag],
        parameters: COLLECTION_QUERY_PARAMS,
        responses: {
          "200": {
            description: "OK",
            content: jsonContent({ type: "array", items: ref }),
            headers: {
              "X-Total-Count": {
                description: "Total items (when using ?_page / ?_limit)",
                schema: { type: "integer" },
              },
            },
          },
        },
      },
      post: {
        summary: `Create ${sing}`,
        tags: [tag],
        requestBody: { required: true, content: jsonContent(ref) },
        responses: { "201": ok(ref, "Created") },
      },
    },
    [itemPath]: {
      get: {
        summary: `Get ${sing}`,
        tags: [tag],
        parameters: [
          ID_PATH_PARAM,
          ...COLLECTION_QUERY_PARAMS.filter((p) =>
            ["_expand", "_embed", "_fields"].includes(p.name)
          ),
        ],
        responses: { "200": ok(ref), "404": { description: "Not found" } },
      },
      put: {
        summary: `Replace ${sing}`,
        tags: [tag],
        parameters: [ID_PATH_PARAM],
        requestBody: { required: true, content: jsonContent(ref) },
        responses: { "200": ok(ref), "404": { description: "Not found" } },
      },
      patch: {
        summary: `Update ${sing}`,
        tags: [tag],
        parameters: [ID_PATH_PARAM],
        requestBody: { required: false, content: jsonContent(ref) },
        responses: { "200": ok(ref), "404": { description: "Not found" } },
      },
      delete: {
        summary: `Delete ${sing}`,
        tags: [tag],
        parameters: [ID_PATH_PARAM],
        responses: { "200": ok(ref, "Deleted item returned"), "404": { description: "Not found" } },
      },
    },
  };
}

// ─── Nested relation paths ────────────────────────────────────────────────────

export function buildRelationPaths(relations: Relations, base: string): Record<string, PathItem> {
  const paths: Record<string, PathItem> = {};

  for (const [source, fields] of Object.entries(relations)) {
    for (const [key, def] of Object.entries(fields)) {
      if (def.type === "many2many") {
        const forwardPath = `${base}/${source}/{id}/${key}`;
        const inversePath = `${base}/${def.target}/{id}/${source}`;

        paths[forwardPath] = {
          get: {
            summary: `List ${def.target} linked to ${singular(source)} via ${def.through}`,
            tags: [source],
            parameters: [ID_PATH_PARAM],
            responses: {
              "200": {
                description: "OK",
                content: jsonContent({ type: "array", items: { type: "object" } }),
              },
              "404": { description: `${singular(source)} not found` },
            },
          },
        };

        paths[inversePath] = {
          get: {
            summary: `List ${source} linked to ${singular(def.target)} via ${def.through} (inverse)`,
            tags: [def.target],
            parameters: [ID_PATH_PARAM],
            responses: {
              "200": {
                description: "OK",
                content: jsonContent({ type: "array", items: { type: "object" } }),
              },
              "404": { description: `${singular(def.target)} not found` },
            },
          },
        };
      } else {
        // many2one or one2one
        const parentSing = singular(def.target);
        const collPath = `${base}/${def.target}/{id}/${source}`;
        const isOne2One = def.type === "one2one";

        const responseSchema: SchemaObject = isOne2One
          ? { type: "object" }
          : { type: "array", items: { type: "object" } };

        paths[collPath] = {
          get: {
            summary: isOne2One
              ? `Get ${singular(source)} belonging to ${parentSing}`
              : `List ${source} belonging to ${parentSing}`,
            tags: [def.target],
            parameters: [ID_PATH_PARAM],
            responses: {
              "200": { description: "OK", content: jsonContent(responseSchema) },
              "404": { description: `${parentSing} not found` },
            },
          },
        };

        // many2one also has a child/:childId route
        if (!isOne2One) {
          const itemPath = `${base}/${def.target}/{id}/${source}/{childId}`;
          paths[itemPath] = {
            get: {
              summary: `Get single ${singular(source)} scoped to ${parentSing}`,
              tags: [def.target],
              parameters: [
                ID_PATH_PARAM,
                { name: "childId", in: "path", required: true, schema: { type: "string" } },
              ],
              responses: {
                "200": { description: "OK", content: jsonContent({ type: "object" }) },
                "404": { description: "Not found" },
              },
            },
          };
        }
      }
    }
  }

  return paths;
}

// ─── Custom route paths ───────────────────────────────────────────────────────

export function buildCustomRoutePaths(
  routes: CustomRoute[],
  base: string
): Record<string, PathItem> {
  const paths: Record<string, PathItem> = {};

  for (const route of routes) {
    const openApiPath = toOpenApiPath(`${base}${route.path}`);
    const method = route.method.toLowerCase() as keyof PathItem;
    const pathParams = extractPathParams(route.path);

    const responses: Record<string, ApiResponse> = {};

    if (route.error) {
      responses[String(route.error)] = { description: `Forced error ${route.error}` };
    } else {
      // Collect all possible status codes from scenarios + otherwise + response
      const statuses = new Set<number>();
      for (const s of route.scenarios ?? []) statuses.add(s.response.status ?? 200);
      if (route.otherwise) statuses.add(route.otherwise.status ?? 200);
      if (route.response) statuses.add(route.response.status ?? 200);
      if (statuses.size === 0) statuses.add(200);

      for (const status of statuses) {
        const bodySource =
          ((route.scenarios ?? []).find((s) => (s.response.status ?? 200) === status)?.response
            .body ?? (route.otherwise?.status ?? 200) === status)
            ? route.otherwise?.body
            : route.response?.body;

        responses[String(status)] = {
          description: status < 400 ? "OK" : "Error",
          ...(bodySource != null ? { content: jsonContent(inferResponseSchema(bodySource)) } : {}),
        };
      }
    }

    const desc = route.handler
      ? `Handler: ${route.handler}()`
      : route.scenarios?.length
        ? `Conditional scenarios (${route.scenarios.length})`
        : "Custom static route";

    const operation: Operation = {
      summary: `${route.method.toUpperCase()} ${route.path}`,
      description: desc,
      tags: ["custom"],
      ...(pathParams.length > 0 ? { parameters: pathParams } : {}),
      responses,
    };

    if (!paths[openApiPath]) paths[openApiPath] = {};
    (paths[openApiPath] as Record<string, unknown>)[method] = operation;
  }

  return paths;
}

function inferResponseSchema(body: unknown): SchemaObject {
  if (body === null || body === undefined) return {};
  if (typeof body !== "object" || Array.isArray(body)) return { type: "object" };

  const properties: Record<string, SchemaObject> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    properties[key] = { type: jsToOpenApiType(value) };
  }
  return { type: "object", properties };
}

function jsToOpenApiType(value: unknown): string {
  if (value === null || value === undefined) return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return "string";
}
