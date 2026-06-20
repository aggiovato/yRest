/**
 * Unit tests for parseData() and hasDataBlock() (src/storage/parseData.ts)
 *
 * Covers:
 *   - Flat format: root-level arrays
 *   - _data block: nested collections
 *   - Mixed: both forms coexist, root-level wins on conflict
 *   - RESERVED keys excluded from flat scan
 *   - hasDataBlock detection
 *   - Non-array values ignored in both forms
 */
import { describe, it, expect } from "vitest";
import { parseData, hasDataBlock } from "../../src/storage/parseData";

// ── Flat format ───────────────────────────────────────────────────────────────

describe("flat format (root-level arrays)", () => {
  it("extracts root-level arrays as collections", () => {
    const result = parseData({
      users: [{ id: 1 }],
      posts: [{ id: 1 }],
    });
    expect(result).toEqual({ users: [{ id: 1 }], posts: [{ id: 1 }] });
  });

  it("ignores non-array root-level values", () => {
    const result = parseData({ users: [{ id: 1 }], title: "my db", count: 5 });
    expect(result).toHaveProperty("users");
    expect(result).not.toHaveProperty("title");
    expect(result).not.toHaveProperty("count");
  });

  it("excludes all RESERVED keys", () => {
    const result = parseData({
      _rel: {},
      _routes: [],
      _schema: {},
      _data: { users: [{ id: 1 }] },
      users: [{ id: 2 }],
    });
    expect(result).not.toHaveProperty("_rel");
    expect(result).not.toHaveProperty("_routes");
    expect(result).not.toHaveProperty("_schema");
    expect(result).not.toHaveProperty("_data");
  });

  it("returns empty object when no arrays present", () => {
    expect(parseData({ title: "db" })).toEqual({});
  });

  it("returns empty object for empty root", () => {
    expect(parseData({})).toEqual({});
  });
});

// ── _data block ───────────────────────────────────────────────────────────────

describe("_data block", () => {
  it("extracts collections from _data block", () => {
    const result = parseData({
      _data: { users: [{ id: 1 }], posts: [{ id: 1 }] },
    });
    expect(result).toEqual({ users: [{ id: 1 }], posts: [{ id: 1 }] });
  });

  it("ignores non-array values inside _data block", () => {
    const result = parseData({ _data: { users: [{ id: 1 }], meta: "ignored" } });
    expect(result).toHaveProperty("users");
    expect(result).not.toHaveProperty("meta");
  });

  it("returns empty object when _data block is empty", () => {
    expect(parseData({ _data: {} })).toEqual({});
  });

  it("treats _data as array (not object) as no-op for block", () => {
    const result = parseData({ _data: [{ id: 1 }] });
    expect(result).toEqual({});
  });

  it("treats _data as string as no-op for block", () => {
    const result = parseData({ _data: "not-an-object" } as Record<string, unknown>);
    expect(result).toEqual({});
  });
});

// ── Mixed — both forms coexist ────────────────────────────────────────────────

describe("mixed: _data block + root-level", () => {
  it("merges collections from both forms", () => {
    const result = parseData({
      _data: { users: [{ id: 1 }] },
      tags: [{ id: 1, label: "news" }],
    });
    expect(result).toHaveProperty("users");
    expect(result).toHaveProperty("tags");
  });

  it("root-level wins over _data block on key conflict", () => {
    const result = parseData({
      _data: { users: [{ id: 99, name: "FromBlock" }] },
      users: [{ id: 1, name: "FromRoot" }],
    });
    expect(result["users"]).toHaveLength(1);
    expect(result["users"]?.[0]).toMatchObject({ name: "FromRoot" });
  });

  it("_data-only key is present when no root conflict", () => {
    const result = parseData({
      _data: { users: [{ id: 1 }], posts: [{ id: 1 }] },
      tags: [{ id: 1 }],
    });
    expect(result).toHaveProperty("users");
    expect(result).toHaveProperty("posts");
    expect(result).toHaveProperty("tags");
  });
});

// ── hasDataBlock ──────────────────────────────────────────────────────────────

describe("hasDataBlock()", () => {
  it("returns true when _data is an object", () => {
    expect(hasDataBlock({ _data: { users: [] } })).toBe(true);
  });

  it("returns true when _data is an empty object", () => {
    expect(hasDataBlock({ _data: {} })).toBe(true);
  });

  it("returns false when _data is absent", () => {
    expect(hasDataBlock({ users: [] })).toBe(false);
  });

  it("returns false when _data is an array", () => {
    expect(hasDataBlock({ _data: [] })).toBe(false);
  });

  it("returns false when _data is a string", () => {
    expect(hasDataBlock({ _data: "db" } as Record<string, unknown>)).toBe(false);
  });

  it("returns false when _data is null", () => {
    expect(hasDataBlock({ _data: null } as Record<string, unknown>)).toBe(false);
  });
});
