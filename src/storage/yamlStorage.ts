import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { parse, stringify } from "yaml";
import type { Data, Relations, Resource } from "./types.js";

/**
 * In-memory store backed by a YAML file.
 *
 * All reads operate on a live in-memory snapshot. Writes must be explicitly
 * flushed to disk by calling {@link persist}. Use {@link reload} to pull in
 * changes made to the file externally (e.g. in watch mode).
 */
export interface YamlStorage {
  /** Returns the full in-memory dataset (all collections). */
  getData(): Data;

  /** Returns the relational mappings declared under `_rel`. */
  getRelations(): Relations;

  /**
   * Returns the items in a named collection, or `undefined` if it does not exist.
   *
   * @param name - Collection name as declared in the YAML file (e.g. `"users"`).
   */
  getCollection(name: string): Resource[] | undefined;

  /**
   * Replaces the items of a named collection in memory.
   * Call {@link persist} afterwards to flush the change to disk.
   *
   * @param name  - Collection name.
   * @param items - New array of items to store.
   */
  setCollection(name: string, items: Resource[]): void;

  /**
   * Atomically writes the current in-memory state to the YAML file.
   *
   * Uses a write-to-temp-then-rename strategy so a crash during the write
   * never leaves the file in a partially written state.
   *
   * @throws {Error} If the filesystem write or rename fails.
   */
  persist(): void;

  /**
   * Reloads the YAML file from disk and updates the in-memory state in place.
   *
   * Mutates the existing `data` and `relations` objects rather than replacing them,
   * so any code holding a reference to the storage instance sees the updated values
   * without needing to re-fetch.
   *
   * @throws {Error} If the file cannot be read or the YAML is malformed.
   */
  reload(): void;
}

/**
 * Creates a {@link YamlStorage} instance backed by the given YAML file.
 *
 * The file is read and parsed eagerly on construction. The `_rel` key is
 * extracted as relational metadata; all other top-level keys become collections.
 *
 * @param filePath - Relative or absolute path to the YAML database file.
 * @throws {Error} If the file cannot be read or its YAML is invalid.
 */
export function createYamlStorage(filePath: string): YamlStorage {
  const absPath = resolve(filePath);
  const raw = parse(readFileSync(absPath, "utf8")) ?? {};

  const relations: Relations = (raw["_rel"] as Relations) ?? {};
  const data: Data = Object.fromEntries(
    Object.entries(raw).filter(([key]) => key !== "_rel")
  ) as Data;

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
  };
}
