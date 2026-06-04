import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { parse, stringify } from "yaml";
import type { DbData, Relations, Resource } from "./types.js";

export interface YamlStorage {
  getData(): DbData;
  getRelations(): Relations;
  getCollection(name: string): Resource[] | undefined;
  setCollection(name: string, items: Resource[]): void;
  persist(): void;
}

export function createYamlStorage(filePath: string): YamlStorage {
  const absPath = resolve(filePath);
  const raw = parse(readFileSync(absPath, "utf8")) ?? {};

  const relations: Relations = (raw["_rel"] as Relations) ?? {};
  const data: DbData = Object.fromEntries(
    Object.entries(raw).filter(([key]) => key !== "_rel")
  ) as DbData;

  return {
    getData() {
      return data;
    },

    getRelations() {
      return relations;
    },

    getCollection(name) {
      return data[name];
    },

    setCollection(name, items) {
      data[name] = items;
    },

    persist() {
      const payload = Object.keys(relations).length > 0
        ? { _rel: relations, ...data }
        : { ...data };
      const tmp = resolve(dirname(absPath), `.yrest-${randomUUID()}.tmp`);
      writeFileSync(tmp, stringify(payload), "utf8");
      renameSync(tmp, absPath);
    },
  };
}
