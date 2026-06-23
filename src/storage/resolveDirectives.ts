import { randomUUID } from "node:crypto";
import type { Data } from "./types.js";

const UUID_GEN_RE = /^__uuid_gen(?::([a-zA-Z0-9_-]+))?$/;
const FK_RE = /^__fk\.([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)$/;

type Registry = Map<string, Map<string, string>>;

/**
 * Resolves load-time data directives in collection items, mutating `data` in place.
 *
 * Two passes:
 *   1. `__uuid_gen` / `__uuid_gen:alias` — replaces with a UUID v4; named aliases are
 *      registered per-collection so FK directives can reference them.
 *   2. `__fk.<collection>:<alias>` — replaces with the UUID registered under that alias.
 *
 * Returns `true` if any directive was resolved (caller should persist the file).
 */
export function resolveDirectives(data: Data): boolean {
  const registry: Registry = new Map();
  let modified = false;

  // Pass 1 — generate UUIDs and register aliases
  for (const [collection, items] of Object.entries(data)) {
    for (const item of items) {
      for (const [field, value] of Object.entries(item)) {
        if (typeof value !== "string") continue;
        const m = UUID_GEN_RE.exec(value);
        if (!m) continue;
        const uuid = randomUUID();
        item[field] = uuid;
        modified = true;
        const alias = m[1];
        if (alias) {
          if (!registry.has(collection)) registry.set(collection, new Map());
          registry.get(collection)!.set(alias, uuid);
        }
      }
    }
  }

  // Pass 2 — resolve FK references
  for (const items of Object.values(data)) {
    for (const item of items) {
      for (const [field, value] of Object.entries(item)) {
        if (typeof value !== "string") continue;
        const m = FK_RE.exec(value);
        if (!m) continue;
        const col = m[1]!;
        const alias = m[2]!;
        const uuid = registry.get(col)?.get(alias);
        if (uuid !== undefined) {
          item[field] = uuid;
          modified = true;
        } else {
          console.warn(`yrest: cannot resolve __fk.${col}:${alias} — alias not registered`);
        }
      }
    }
  }

  return modified;
}
