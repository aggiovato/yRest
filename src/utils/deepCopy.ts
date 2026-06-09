import type { Data } from "../storage/types.js";

/**
 * Returns a shallow copy of each item in every collection of a {@link Data} object.
 *
 * Sufficient for snapshot isolation because items are plain records with no nested
 * mutable references beyond their own fields.
 *
 * @param source - The data object to copy.
 */
export function deepCopyData(source: Data): Data {
  return Object.fromEntries(
    Object.entries(source).map(([k, v]) => [k, v.map((item) => ({ ...item }))])
  ) as Data;
}
