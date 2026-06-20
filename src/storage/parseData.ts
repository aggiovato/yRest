import type { Data } from "./types.js";

const RESERVED = new Set(["_rel", "_routes", "_schema", "_data"]);

/**
 * Extracts collection data from a parsed YAML root object.
 *
 * Supports two forms — they can coexist and are merged (root-level wins on conflict):
 * - **Flat** (default): arrays directly at root, e.g. `users: [...]`
 * - **`_data` block**: collections nested under `_data:`, e.g. `_data: { users: [...] }`
 *
 * Any key in `RESERVED` is excluded from the flat scan. Non-array values are ignored in both forms.
 */
export function parseData(raw: Record<string, unknown>): Data {
  const block = raw["_data"];
  const fromBlock: Data =
    block && typeof block === "object" && !Array.isArray(block)
      ? (Object.fromEntries(
          Object.entries(block as Record<string, unknown>).filter(([, v]) => Array.isArray(v))
        ) as Data)
      : {};

  const fromRoot: Data = Object.fromEntries(
    Object.entries(raw).filter(([key, val]) => !RESERVED.has(key) && Array.isArray(val))
  ) as Data;

  return { ...fromBlock, ...fromRoot };
}

/** Returns true when the raw YAML root contains a `_data` object block. */
export function hasDataBlock(raw: Record<string, unknown>): boolean {
  const d = raw["_data"];
  return d !== null && d !== undefined && typeof d === "object" && !Array.isArray(d);
}
