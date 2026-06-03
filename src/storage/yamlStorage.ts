import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { parse, stringify } from "yaml";
import type { DbData, Resource } from "./types.js";

export interface YamlStorage {
  getData(): DbData;
  getCollection(name: string): Resource[] | undefined;
  setCollection(name: string, items: Resource[]): void;
  persist(): void;
}

export function createYamlStorage(filePath: string): YamlStorage {
  const absPath = resolve(filePath);
  const raw = readFileSync(absPath, "utf8");
  const data: DbData = parse(raw) ?? {};

  return {
    getData() {
      return data;
    },

    getCollection(name) {
      return data[name];
    },

    setCollection(name, items) {
      data[name] = items;
    },

    persist() {
      const tmp = resolve(dirname(absPath), `${tmpdir()}/.yaml-rest-${randomUUID()}.yml`);
      writeFileSync(tmp, stringify(data), "utf8");
      renameSync(tmp, absPath);
    },
  };
}
