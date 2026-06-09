import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { parse, stringify } from "yaml";
import type { CustomRoute, Data, Relations, YamlStorage } from "./types.js";
import { deepCopyData } from "../utils/deepCopy.js";

/**
 * Creates a {@link YamlStorage} instance backed by the given YAML file.
 *
 * The file is read and parsed eagerly on construction. The `_rel` key is
 * extracted as relational metadata; `_routes` as custom route declarations;
 * all other top-level keys become collections.
 *
 * @param filePath - Relative or absolute path to the YAML database file.
 * @throws {Error} If the file cannot be read or its YAML is invalid.
 */
export function createYamlStorage(filePath: string): YamlStorage {
  const absPath = resolve(filePath);
  const raw = parse(readFileSync(absPath, "utf8")) ?? {};

  const relations: Relations = (raw["_rel"] as Relations) ?? {};
  const routes: CustomRoute[] = Array.isArray(raw["_routes"])
    ? (raw["_routes"] as CustomRoute[])
    : [];
  const data: Data = Object.fromEntries(
    Object.entries(raw).filter(([key]) => key !== "_rel" && key !== "_routes")
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
      const payload =
        Object.keys(relations).length > 0 ? { _rel: relations, ...data } : { ...data };
      const tmp = resolve(dirname(absPath), `.yrest-${randomUUID()}.tmp`);
      writeFileSync(tmp, stringify(payload), "utf8");
      renameSync(tmp, absPath);
    },

    reload() {
      const fresh = parse(readFileSync(absPath, "utf8")) ?? {};
      const freshRelations = (fresh["_rel"] as Relations) ?? {};
      const freshData = Object.fromEntries(
        Object.entries(fresh).filter(([key]) => key !== "_rel")
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
