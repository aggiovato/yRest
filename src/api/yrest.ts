import { parse } from "yaml";
import type { Data } from "../storage/types.js";

/**
 * Tagged template literal that parses inline YAML into a yRest {@link Data} object.
 *
 * Strips common leading indentation automatically, so the template can be
 * indented naturally inside the calling function without affecting YAML parsing.
 *
 * Supports interpolated values — they are stringified and inserted inline.
 *
 * @throws {Error} If the template is not valid YAML or does not resolve to a plain object.
 *
 * @example
 * const data = yrest`
 *   users:
 *     - id: 1
 *       name: Ana
 *   posts:
 *     - id: 1
 *       title: First post
 *       userId: 1
 * `;
 */
export function yrest(strings: TemplateStringsArray, ...values: unknown[]): Data {
  const raw = strings.reduce<string>(
    (acc, str, i) => acc + str + (values[i] !== undefined ? stringifyInterpolation(values[i]) : ""),
    ""
  );

  const dedented = dedent(raw);

  let parsed: unknown;
  try {
    parsed = parse(dedented);
  } catch (e) {
    throw new Error(`[yrest] Invalid YAML: ${e instanceof Error ? e.message : String(e)}`, {
      cause: e,
    });
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("[yrest] Template must resolve to a YAML object with collection keys.");
  }

  return parsed as Data;
}

function stringifyInterpolation(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const type = Array.isArray(value) ? "array" : typeof value;
  throw new Error(
    `[yrest] Cannot interpolate a value of type "${type}". Only string, number, and boolean are supported.`
  );
}

function dedent(str: string): string {
  const lines = str.split("\n");

  const minIndent = lines
    .filter((line) => line.trim().length > 0)
    .reduce((min, line) => {
      const match = line.match(/^(\s*)/);
      return Math.min(min, match ? match[1].length : 0);
    }, Infinity);

  const indent = minIndent === Infinity ? 0 : minIndent;

  return lines
    .map((line) => line.slice(indent))
    .join("\n")
    .trim();
}
