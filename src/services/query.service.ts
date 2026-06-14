import type { Resource } from "../storage/types.js";

export const OPERATORS = ["_gte", "_lte", "_ne", "_like", "_start", "_regex"] as const;
export type Operator = (typeof OPERATORS)[number];

export function applyOperator(itemValue: unknown, op: Operator, filterValue: string): boolean {
  const strItem = String(itemValue);
  const numItem = Number(itemValue);
  const numFilter = Number(filterValue);
  const numeric = !isNaN(numItem) && !isNaN(numFilter) && filterValue.trim() !== "";

  switch (op) {
    case "_gte":
      return numeric ? numItem >= numFilter : strItem >= filterValue;
    case "_lte":
      return numeric ? numItem <= numFilter : strItem <= filterValue;
    case "_ne":
      return strItem !== filterValue;
    case "_like":
      return strItem.toLowerCase().includes(filterValue.toLowerCase());
    case "_start":
      return strItem.toLowerCase().startsWith(filterValue.toLowerCase());
    case "_regex": {
      // Guard against ReDoS: reject patterns longer than 200 chars before compiling.
      if (filterValue.length > 200) return false;
      try {
        return new RegExp(filterValue, "i").test(strItem);
      } catch {
        return false;
      }
    }
  }
}

/**
 * Filters a collection by query params.
 *
 * Params prefixed with `_` are reserved for pagination/sorting and are ignored here.
 * Comparison converts each item field to string, so `?id=1` matches a numeric `id: 1`.
 * Repeated params (e.g. `?role=admin&role=user`) are treated as OR — any match passes.
 *
 * Field operator suffixes are supported: `_gte`, `_lte`, `_ne`, `_like`, `_start`, `_regex`.
 * Example: `?price_gte=100&name_like=ana&status_ne=inactive`.
 *
 * @param items - Collection to filter.
 * @param query - Raw query string params from the request.
 */
export function filterByQuery(
  items: Resource[],
  query: Record<string, string | string[]>
): Resource[] {
  const filters = Object.entries(query).filter(([key]) => !key.startsWith("_"));
  if (filters.length === 0) return items;

  return items.filter((item) =>
    filters.every(([key, value]) => {
      const op = OPERATORS.find((o) => key.endsWith(o));

      if (op) {
        const field = key.slice(0, -op.length);
        if (item[field] === undefined) return false;
        const filterVal = Array.isArray(value) ? value[0]! : value;
        return applyOperator(item[field], op, filterVal);
      }

      if (item[key] === undefined) return false;
      const itemStr = String(item[key]);
      return Array.isArray(value) ? value.includes(itemStr) : itemStr === value;
    })
  );
}

/**
 * Filters a collection by a full-text search term across all scalar fields.
 *
 * Searches every string and number field of each item (case-insensitive substring match).
 * Object and array values are skipped. An item passes if any field contains the term.
 *
 * @param items - Collection to search.
 * @param term  - Search term from `?_q=`.
 */
export function fullTextSearch(items: Resource[], term: string): Resource[] {
  const lower = term.toLowerCase();
  return items.filter((item) =>
    Object.values(item).some((val) => {
      if (val === null || val === undefined || typeof val === "object") return false;
      return String(val).toLowerCase().includes(lower);
    })
  );
}

/**
 * Returns a sorted copy of the collection.
 *
 * Items missing the sort field are pushed to the end.
 * String comparison is case-insensitive; numbers are compared numerically.
 *
 * @param items - Collection to sort.
 * @param field - Field name to sort by.
 * @param order - Sort direction: `"asc"` (default) or `"desc"`.
 */
export function sortBy(items: Resource[], field: string, order: "asc" | "desc"): Resource[] {
  const direction = order === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
    return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" }) * direction;
  });
}

/**
 * Projects a subset of fields from a single item.
 *
 * @param item   - The source item.
 * @param fields - Field names to keep. Fields absent in the item are silently ignored.
 */
export function projectFields(item: Resource, fields: string[]): Resource;

/**
 * Projects a subset of fields from each item in a collection.
 *
 * Applied last in the pipeline — after `_expand` and `_embed` — so projected
 * fields can include embedded/expanded keys.
 *
 * @param items  - Collection to project.
 * @param fields - Field names to keep. Fields absent in an item are silently ignored.
 */
export function projectFields(items: Resource[], fields: string[]): Resource[];

export function projectFields(
  input: Resource | Resource[],
  fields: string[]
): Resource | Resource[] {
  if (fields.length === 0) return input;
  const project = (item: Resource): Resource =>
    Object.fromEntries(fields.filter((f) => f in item).map((f) => [f, item[f]])) as Resource;
  return Array.isArray(input) ? input.map(project) : project(input);
}

/**
 * Returns a single page of items from an already-filtered collection.
 *
 * @param items - Pre-filtered (and optionally sorted) collection.
 * @param page  - 1-based page number.
 * @param limit - Maximum number of items per page.
 */
export function paginate(items: Resource[], page: number, limit: number): Resource[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}
