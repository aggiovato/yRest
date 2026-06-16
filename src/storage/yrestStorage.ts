import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { parse, stringify } from "yaml";
import type {
  CustomRoute,
  Data,
  RelationDef,
  Relations,
  SchemaBlock,
  YrestStorage,
} from "./types.js";
import { parseRelations } from "./parseRelations.js";
import { parseRoutes } from "./parseRoutes.js";
import { parseSchema } from "./parseSchema.js";
import { deepCopyData } from "../utils/deepCopy.js";

/**
 * Creates a {@link YrestStorage} instance backed by the given YAML file.
 *
 * The file is read and parsed eagerly on construction. The `_rel` key is
 * extracted as relational metadata; `_routes` as custom route declarations;
 * all other top-level keys become collections.
 *
 * @param filePath - Relative or absolute path to the YAML database file.
 * @throws {Error} If the file cannot be read or its YAML is invalid.
 */
function serializeRelations(relations: Relations): unknown {
  const out: Record<string, unknown> = {};
  for (const [col, fields] of Object.entries(relations)) {
    out[col] = {};
    for (const [key, def] of Object.entries(fields)) {
      (out[col] as Record<string, unknown>)[key] = serializeRelationDef(def);
    }
  }
  return out;
}

function serializeRelationDef(def: RelationDef): unknown {
  if (def.type === "many2many") {
    const entry: Record<string, unknown> = {
      _type: def.type,
      _target: def.target,
      _through: def.through,
      _foreignKey: def.foreignKey,
      _otherKey: def.otherKey,
    };
    if (def.nested) entry._nested = true;
    return entry;
  }
  const entry: Record<string, unknown> = { _type: def.type, _target: def.target };
  if (def.nested) entry._nested = true;
  return entry;
}

function serializeRoutes(routes: CustomRoute[]): unknown[] {
  return routes.map((r) => {
    const entry: Record<string, unknown> = { _method: r.method, _path: r.path };
    if (r.handler) entry._handler = r.handler;
    if (r.delay !== undefined) entry._delay = r.delay;
    if (r.error !== undefined) entry._error = r.error;
    if (r.errorBody !== undefined) entry._errorBody = r.errorBody;
    if (r.response) entry._response = serializeResponse(r.response);
    if (r.otherwise) entry._otherwise = serializeResponse(r.otherwise);
    if (r.scenarios?.length) entry._scenarios = r.scenarios.map(serializeScenario);
    return entry;
  });
}

function serializeResponse(res: import("./types.js").RouteResponse): unknown {
  const out: Record<string, unknown> = {};
  if (res.status !== undefined) out._status = res.status;
  if (res.body !== undefined) out._body = res.body;
  if (res.headers) out._headers = res.headers;
  return out;
}

function serializeScenario(s: import("./types.js").Scenario): unknown {
  return { _when: s.when, _response: serializeResponse(s.response) };
}

export function createYrestStorage(filePath: string): YrestStorage {
  const absPath = resolve(filePath);
  const raw = parse(readFileSync(absPath, "utf8")) ?? {};

  const RESERVED = new Set(["_rel", "_routes", "_schema"]);
  const relations: Relations = parseRelations(raw["_rel"]);
  const routes: CustomRoute[] = parseRoutes(raw["_routes"]);
  const schema: SchemaBlock = parseSchema(raw["_schema"]);
  const data: Data = Object.fromEntries(
    Object.entries(raw).filter(([key]) => !RESERVED.has(key))
  ) as Data;

  let snapshot = {
    data: deepCopyData(data),
    relations: { ...relations },
    savedAt: new Date(),
  };

  return {
    getData() {
      return data;
    },

    getRelations() {
      return relations;
    },

    getSchema() {
      return schema;
    },

    getRoutes() {
      return routes;
    },

    getCollection(name) {
      return data[name];
    },

    setCollection(name, items) {
      data[name] = items;
    },

    persist() {
      const payload: Record<string, unknown> = {};
      if (Object.keys(relations).length > 0) payload._rel = serializeRelations(relations);
      // _routes is static config — never modified at runtime, always round-tripped as-is.
      if (routes.length > 0) payload._routes = serializeRoutes(routes);
      Object.assign(payload, data);
      const tmp = resolve(dirname(absPath), `.yrest-${randomUUID()}.tmp`);
      writeFileSync(tmp, stringify(payload), "utf8");
      renameSync(tmp, absPath);
    },

    reload() {
      const fresh = parse(readFileSync(absPath, "utf8")) ?? {};
      const freshRelations = parseRelations(fresh["_rel"]);
      const freshData = Object.fromEntries(
        Object.entries(fresh).filter(([key]) => !RESERVED.has(key))
      ) as Data;

      for (const key of Object.keys(data)) delete data[key];
      Object.assign(data, freshData);
      for (const key of Object.keys(relations)) delete relations[key];
      Object.assign(relations, freshRelations);
    },

    getSnapshot() {
      return snapshot;
    },

    saveSnapshot() {
      snapshot = {
        data: deepCopyData(data),
        relations: { ...relations },
        savedAt: new Date(),
      };
    },

    resetToSnapshot() {
      const snap = deepCopyData(snapshot.data);
      for (const key of Object.keys(data)) delete data[key];
      Object.assign(data, snap);
      for (const key of Object.keys(relations)) delete relations[key];
      Object.assign(relations, { ...snapshot.relations });
      this.persist();
    },
  };
}
