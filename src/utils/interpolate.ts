import { randomUUID } from "node:crypto";

/** Request context passed to the template interpolation engine. */
export type TemplateContext = {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: unknown;
  headers: Record<string, string | string[]>;
};

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc, key) => {
    if (acc != null && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function resolveVar(path: string, ctx: TemplateContext): unknown {
  if (path === "now") return new Date().toISOString();
  if (path === "uuid") return randomUUID();
  if (path === "body") return ctx.body;
  if (path.startsWith("body.")) return getPath(ctx.body, path.slice(5));
  if (path.startsWith("params.")) return ctx.params[path.slice(7)] ?? "";
  if (path.startsWith("query.")) {
    const val = ctx.query[path.slice(6)];
    return Array.isArray(val) ? val[0] : (val ?? "");
  }
  if (path.startsWith("headers.")) {
    const val = ctx.headers[path.slice(8)];
    return Array.isArray(val) ? val[0] : (val ?? "");
  }
  return "";
}

function interpolateString(str: string, ctx: TemplateContext): unknown {
  // Exact match "{{variable}}" → return the raw value, preserving its type.
  const exact = str.match(/^\{\{([^}]+)\}\}$/);
  if (exact) return resolveVar(exact[1].trim(), ctx);

  // Embedded in a larger string → stringify each resolved variable.
  return str.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const val = resolveVar(path.trim(), ctx);
    return val == null ? "" : String(val);
  });
}

/**
 * Recursively interpolates `{{variable}}` placeholders in a template value.
 *
 * Strings are processed for placeholders; objects and arrays are walked recursively.
 * Numbers, booleans, and `null` are returned unchanged.
 *
 * When a string contains only a single `{{variable}}` placeholder, the resolved
 * value is returned as-is (preserving its original type). When embedded in a larger
 * string, the variable is stringified.
 *
 * @param template - The value to interpolate (any YAML-deserialised type).
 * @param ctx      - Request context providing params, query, body, and headers.
 * @returns The interpolated value with the same structural shape as the input.
 */
export function interpolate(template: unknown, ctx: TemplateContext): unknown {
  if (typeof template === "string") return interpolateString(template, ctx);
  if (Array.isArray(template)) return template.map((item) => interpolate(item, ctx));
  if (template !== null && typeof template === "object") {
    return Object.fromEntries(
      Object.entries(template as Record<string, unknown>).map(([k, v]) => [k, interpolate(v, ctx)])
    );
  }
  return template;
}

/** Returns true if the serialised form of `value` contains any `{{` placeholder. */
export function hasTemplates(value: unknown): boolean {
  return typeof value === "string" ? value.includes("{{") : JSON.stringify(value).includes("{{");
}
