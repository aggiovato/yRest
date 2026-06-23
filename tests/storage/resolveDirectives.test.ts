import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveDirectives } from "../../src/storage/resolveDirectives";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveDirectives — __uuid_gen", () => {
  it("replaces __uuid_gen with a UUID v4", () => {
    const data = { users: [{ id: "__uuid_gen", name: "Ana" }] };
    resolveDirectives(data);
    expect(data.users[0]!.id).toMatch(UUID_RE);
  });

  it("returns true when a directive was resolved", () => {
    const data = { users: [{ id: "__uuid_gen" }] };
    expect(resolveDirectives(data)).toBe(true);
  });

  it("returns false when no directives are present", () => {
    const data = { users: [{ id: 1, name: "Ana" }] };
    expect(resolveDirectives(data)).toBe(false);
  });

  it("each __uuid_gen gets a unique UUID", () => {
    const data = {
      users: [
        { id: "__uuid_gen", name: "Ana" },
        { id: "__uuid_gen", name: "Luis" },
      ],
    };
    resolveDirectives(data);
    expect(data.users[0]!.id).not.toBe(data.users[1]!.id);
  });

  it("__uuid_gen:alias generates UUID and registers alias", () => {
    const data = {
      users: [{ id: "__uuid_gen:ana", name: "Ana" }],
      posts: [{ id: 1, userId: "__fk.users:ana" }],
    };
    resolveDirectives(data);
    expect(data.users[0]!.id).toMatch(UUID_RE);
    expect(data.posts[0]!.userId).toBe(data.users[0]!.id);
  });

  it("__uuid_gen without alias does not block FK from same collection", () => {
    const data = {
      users: [
        { id: "__uuid_gen", name: "Bob" }, // no alias
        { id: "__uuid_gen:ana", name: "Ana" }, // has alias
      ],
      posts: [{ id: 1, userId: "__fk.users:ana" }],
    };
    resolveDirectives(data);
    expect(data.posts[0]!.userId).toBe(data.users[1]!.id);
  });

  it("does not modify non-string fields", () => {
    const data = { users: [{ id: 42, active: true, score: 3.14 }] };
    resolveDirectives(data);
    expect(data.users[0]!.id).toBe(42);
    expect(data.users[0]!.active).toBe(true);
    expect(data.users[0]!.score).toBe(3.14);
  });

  it("does not modify strings that are not directives", () => {
    const data = { users: [{ id: 1, name: "Ana", role: "__admin" }] };
    resolveDirectives(data);
    expect(data.users[0]!.role).toBe("__admin");
  });

  it("resolves __uuid_gen in non-id fields too", () => {
    const data = { tokens: [{ id: 1, value: "__uuid_gen" }] };
    resolveDirectives(data);
    expect(data.tokens[0]!.value).toMatch(UUID_RE);
  });
});

describe("resolveDirectives — __fk", () => {
  it("resolves __fk.collection:alias to the registered UUID", () => {
    const data = {
      users: [{ id: "__uuid_gen:ale", name: "Ale" }],
      posts: [{ id: "__uuid_gen", title: "Hello", userId: "__fk.users:ale" }],
    };
    resolveDirectives(data);
    expect(data.posts[0]!.userId).toBe(data.users[0]!.id);
    expect(data.posts[0]!.userId).toMatch(UUID_RE);
  });

  it("multiple aliases in same collection are independent", () => {
    const data = {
      users: [
        { id: "__uuid_gen:ale", name: "Ale" },
        { id: "__uuid_gen:luis", name: "Luis" },
      ],
      posts: [
        { id: 1, userId: "__fk.users:ale" },
        { id: 2, userId: "__fk.users:luis" },
      ],
    };
    resolveDirectives(data);
    expect(data.posts[0]!.userId).toBe(data.users[0]!.id);
    expect(data.posts[1]!.userId).toBe(data.users[1]!.id);
    expect(data.posts[0]!.userId).not.toBe(data.posts[1]!.userId);
  });

  it("same alias in different collections are independent", () => {
    const data = {
      users: [{ id: "__uuid_gen:ale", name: "Ale" }],
      categories: [{ id: "__uuid_gen:ale", name: "Tech" }],
      posts: [
        { id: 1, userId: "__fk.users:ale" },
        { id: 2, catId: "__fk.categories:ale" },
      ],
    };
    resolveDirectives(data);
    expect(data.posts[0]!.userId).toBe(data.users[0]!.id);
    expect(data.posts[1]!.catId).toBe(data.categories[0]!.id);
    expect(data.posts[0]!.userId).not.toBe(data.posts[1]!.catId);
  });

  it("unresolvable __fk alias warns and leaves the value unchanged", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = { posts: [{ id: 1, userId: "__fk.users:nonexistent" }] };
    resolveDirectives(data);
    expect(data.posts[0]!.userId).toBe("__fk.users:nonexistent");
    expect(warn).toHaveBeenCalledWith(
      "yrest: cannot resolve __fk.users:nonexistent — alias not registered"
    );
  });

  it("returns true when __fk was resolved", () => {
    const data = {
      users: [{ id: "__uuid_gen:ale" }],
      posts: [{ id: 1, userId: "__fk.users:ale" }],
    };
    expect(resolveDirectives(data)).toBe(true);
  });

  it("returns false when __fk is unresolvable and no uuid_gen present", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = { posts: [{ id: 1, userId: "__fk.users:ghost" }] };
    expect(resolveDirectives(data)).toBe(false);
    warn.mockRestore();
  });

  it("resolves FK to the exact same UUID string as the source field", () => {
    const data = {
      users: [{ id: "__uuid_gen:ale" }],
      posts: [
        { id: 1, userId: "__fk.users:ale" },
        { id: 2, userId: "__fk.users:ale" },
      ],
    };
    resolveDirectives(data);
    const uuid = data.users[0]!.id as string;
    expect(data.posts[0]!.userId).toBe(uuid);
    expect(data.posts[1]!.userId).toBe(uuid);
  });
});

describe("resolveDirectives — empty and edge cases", () => {
  it("handles empty data object", () => {
    expect(resolveDirectives({})).toBe(false);
  });

  it("handles empty collections", () => {
    expect(resolveDirectives({ users: [], posts: [] })).toBe(false);
  });

  it("does not recurse into nested objects", () => {
    const data = {
      users: [{ id: 1, address: { street: "__uuid_gen" } }],
    };
    resolveDirectives(data);
    // nested value should NOT be resolved — only top-level item fields
    expect((data.users[0]!.address as Record<string, unknown>)["street"]).toBe("__uuid_gen");
  });
});
