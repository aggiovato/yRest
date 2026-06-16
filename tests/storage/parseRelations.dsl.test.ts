/**
 * Unit tests for parseRelations() — DSL string forms (Phase 11B)
 *
 * Covers all three levels of the compact relation DSL:
 *   Level 1: plain string shorthand     → "target"
 *   Level 2: type + target              → "m2o:target" | "m2o:target[car->car]"
 *   Level 3: type + target + FK alias   → "m2o:target@fk" | "m2o:target@fk[car->car]"
 *   Many2many: full pivot form          → "m2m:target@through(fk,ok)" + cardinality + +nested
 *   Verbose object form: still works as before
 */
import { describe, it, expect } from "vitest";
import { parseRelations } from "../../src/storage/parseRelations";

// ── Helpers ───────────────────────────────────────────────────────────────────

function rel(fields: Record<string, unknown>) {
  return parseRelations({ posts: fields });
}

function def(fields: Record<string, unknown>) {
  const r = rel(fields);
  return r["posts"];
}

// ── Level 1 — plain string shorthand ─────────────────────────────────────────

describe("level 1 — plain string shorthand", () => {
  it("maps plain string to many2one", () => {
    expect(def({ userId: "users" })).toEqual({
      userId: { type: "many2one", target: "users" },
    });
  });

  it("does not add extra properties", () => {
    const result = def({ userId: "users" })?.["userId"];
    expect(result).not.toHaveProperty("nested");
    expect(result).not.toHaveProperty("carDirect");
    expect(result).not.toHaveProperty("foreignKey");
  });
});

// ── Level 2a — DSL: type + target (no cardinality) ───────────────────────────

describe("level 2a — type:target (no cardinality)", () => {
  it("m2o alias resolves to many2one", () => {
    expect(def({ userId: "m2o:users" })).toEqual({
      userId: { type: "many2one", target: "users" },
    });
  });

  it("many2one full name resolves correctly", () => {
    expect(def({ userId: "many2one:users" })).toEqual({
      userId: { type: "many2one", target: "users" },
    });
  });

  it("o2o alias resolves to one2one", () => {
    expect(def({ userId: "o2o:users" })).toEqual({
      userId: { type: "one2one", target: "users" },
    });
  });

  it("one2one full name resolves correctly", () => {
    expect(def({ userId: "one2one:users" })).toEqual({
      userId: { type: "one2one", target: "users" },
    });
  });
});

// ── Level 2b — DSL: type + target + cardinality ───────────────────────────────

describe("level 2b — type:target[cardinality]", () => {
  it("parses cardinality 1..1->1..n on many2one", () => {
    expect(def({ userId: "m2o:users[1..1->1..n]" })).toEqual({
      userId: { type: "many2one", target: "users", carDirect: "1..1", carInverse: "1..n" },
    });
  });

  it("parses cardinality 1..1->0..n", () => {
    expect(def({ userId: "m2o:users[1..1->0..n]" })).toEqual({
      userId: { type: "many2one", target: "users", carDirect: "1..1", carInverse: "0..n" },
    });
  });

  it("parses cardinality on one2one", () => {
    expect(def({ userId: "o2o:users[1..1->1..1]" })).toEqual({
      userId: { type: "one2one", target: "users", carDirect: "1..1", carInverse: "1..1" },
    });
  });

  it("parses optional cardinality 0..1->0..1", () => {
    expect(def({ userId: "o2o:users[0..1->0..1]" })).toEqual({
      userId: { type: "one2one", target: "users", carDirect: "0..1", carInverse: "0..1" },
    });
  });
});

// ── Level 3 — DSL: type + target + FK alias ───────────────────────────────────

describe("level 3 — type:target@foreignKey", () => {
  it("parses FK alias on many2one", () => {
    expect(def({ author: "m2o:users@authorId" })).toEqual({
      author: { type: "many2one", target: "users", foreignKey: "authorId" },
    });
  });

  it("parses FK alias on one2one", () => {
    expect(def({ profile: "o2o:profiles@profileId" })).toEqual({
      profile: { type: "one2one", target: "profiles", foreignKey: "profileId" },
    });
  });

  it("parses FK alias + cardinality together", () => {
    expect(def({ author: "m2o:users@authorId[1..1->0..n]" })).toEqual({
      author: {
        type: "many2one",
        target: "users",
        foreignKey: "authorId",
        carDirect: "1..1",
        carInverse: "0..n",
      },
    });
  });

  it("parses FK alias on one2one + cardinality", () => {
    expect(def({ profile: "o2o:profiles@profileId[1..1->1..1]" })).toEqual({
      profile: {
        type: "one2one",
        target: "profiles",
        foreignKey: "profileId",
        carDirect: "1..1",
        carInverse: "1..1",
      },
    });
  });
});

// ── Many2many — pivot form ────────────────────────────────────────────────────

describe("many2many DSL", () => {
  it("m2m alias with pivot table", () => {
    expect(def({ tags: "m2m:tags@post_tags(postId,tagId)" })).toEqual({
      tags: {
        type: "many2many",
        target: "tags",
        through: "post_tags",
        foreignKey: "postId",
        otherKey: "tagId",
      },
    });
  });

  it("many2many full name alias", () => {
    expect(def({ tags: "many2many:tags@post_tags(postId,tagId)" })).toEqual({
      tags: {
        type: "many2many",
        target: "tags",
        through: "post_tags",
        foreignKey: "postId",
        otherKey: "tagId",
      },
    });
  });

  it("m2m with cardinality", () => {
    expect(def({ tags: "m2m:tags@post_tags(postId,tagId)[0..n->0..n]" })).toEqual({
      tags: {
        type: "many2many",
        target: "tags",
        through: "post_tags",
        foreignKey: "postId",
        otherKey: "tagId",
        carDirect: "0..n",
        carInverse: "0..n",
      },
    });
  });

  it("m2m with 1..n->0..n cardinality", () => {
    expect(
      def({ categories: "m2m:categories@product_cats(productId,categoryId)[1..n->0..n]" })
    ).toEqual({
      categories: {
        type: "many2many",
        target: "categories",
        through: "product_cats",
        foreignKey: "productId",
        otherKey: "categoryId",
        carDirect: "1..n",
        carInverse: "0..n",
      },
    });
  });

  it("m2m tolerates space after comma in pivot", () => {
    expect(def({ tags: "m2m:tags@post_tags(postId, tagId)" })).toEqual({
      tags: {
        type: "many2many",
        target: "tags",
        through: "post_tags",
        foreignKey: "postId",
        otherKey: "tagId",
      },
    });
  });
});

// ── +nested flag ──────────────────────────────────────────────────────────────

describe("+nested flag", () => {
  it("level 1 string — not supported (nested must use DSL or verbose form)", () => {
    // plain string "users" has no +nested; stays as-is
    expect(def({ userId: "users" })).toEqual({ userId: { type: "many2one", target: "users" } });
  });

  it("m2o with +nested", () => {
    expect(def({ userId: "m2o:users+nested" })).toEqual({
      userId: { type: "many2one", target: "users", nested: true },
    });
  });

  it("o2o with +nested", () => {
    expect(def({ profile: "o2o:profiles+nested" })).toEqual({
      profile: { type: "one2one", target: "profiles", nested: true },
    });
  });

  it("m2o with cardinality + +nested", () => {
    expect(def({ userId: "m2o:users[1..1->0..n]+nested" })).toEqual({
      userId: {
        type: "many2one",
        target: "users",
        carDirect: "1..1",
        carInverse: "0..n",
        nested: true,
      },
    });
  });

  it("m2o with FK alias + cardinality + +nested", () => {
    expect(def({ author: "m2o:users@authorId[1..1->0..n]+nested" })).toEqual({
      author: {
        type: "many2one",
        target: "users",
        foreignKey: "authorId",
        carDirect: "1..1",
        carInverse: "0..n",
        nested: true,
      },
    });
  });

  it("m2m with +nested", () => {
    expect(def({ tags: "m2m:tags@post_tags(postId,tagId)+nested" })).toEqual({
      tags: {
        type: "many2many",
        target: "tags",
        through: "post_tags",
        foreignKey: "postId",
        otherKey: "tagId",
        nested: true,
      },
    });
  });

  it("m2m with cardinality + +nested", () => {
    expect(def({ tags: "m2m:tags@post_tags(postId,tagId)[0..n->0..n]+nested" })).toEqual({
      tags: {
        type: "many2many",
        target: "tags",
        through: "post_tags",
        foreignKey: "postId",
        otherKey: "tagId",
        carDirect: "0..n",
        carInverse: "0..n",
        nested: true,
      },
    });
  });
});

// ── Verbose object form — still works ─────────────────────────────────────────

describe("verbose object form — backward compatibility", () => {
  it("many2one with _type/_target", () => {
    expect(def({ userId: { _type: "many2one", _target: "users" } })).toEqual({
      userId: { type: "many2one", target: "users" },
    });
  });

  it("many2one with _foreignKey", () => {
    expect(
      def({ author: { _type: "many2one", _target: "users", _foreignKey: "authorId" } })
    ).toEqual({
      author: { type: "many2one", target: "users", foreignKey: "authorId" },
    });
  });

  it("one2one with _type/_target", () => {
    expect(def({ profile: { _type: "one2one", _target: "profiles" } })).toEqual({
      profile: { type: "one2one", target: "profiles" },
    });
  });

  it("many2many verbose with all pivot fields", () => {
    expect(
      def({
        tags: {
          _type: "many2many",
          _target: "tags",
          _through: "post_tags",
          _foreignKey: "postId",
          _otherKey: "tagId",
        },
      })
    ).toEqual({
      tags: {
        type: "many2many",
        target: "tags",
        through: "post_tags",
        foreignKey: "postId",
        otherKey: "tagId",
      },
    });
  });

  it("verbose with _nested: true", () => {
    expect(def({ userId: { _type: "many2one", _target: "users", _nested: true } })).toEqual({
      userId: { type: "many2one", target: "users", nested: true },
    });
  });

  it("verbose with _car-direct and _car-inverse", () => {
    expect(
      def({
        bookingId: {
          _type: "many2one",
          _target: "bookings",
          "_car-direct": "1..1",
          "_car-inverse": "1..n",
        },
      })
    ).toEqual({
      bookingId: { type: "many2one", target: "bookings", carDirect: "1..1", carInverse: "1..n" },
    });
  });
});

// ── Mixed — DSL and verbose in the same _rel block ────────────────────────────

describe("mixed DSL + verbose in the same collection", () => {
  it("combines both forms for different keys", () => {
    const result = parseRelations({
      posts: {
        userId: "m2o:users[1..1->0..n]",
        tags: {
          _type: "many2many",
          _target: "tags",
          _through: "post_tags",
          _foreignKey: "postId",
          _otherKey: "tagId",
        },
      },
    });
    expect(result["posts"]).toEqual({
      userId: { type: "many2one", target: "users", carDirect: "1..1", carInverse: "0..n" },
      tags: {
        type: "many2many",
        target: "tags",
        through: "post_tags",
        foreignKey: "postId",
        otherKey: "tagId",
      },
    });
  });

  it("combines level 1 shorthand, DSL level 3, and verbose", () => {
    const result = parseRelations({
      comments: {
        postId: "posts",
        userId: "m2o:users@userId[1..1->0..n]+nested",
        categoryId: {
          _type: "many2one",
          _target: "categories",
          "_car-direct": "1..1",
          "_car-inverse": "0..n",
        },
      },
    });
    expect(result["comments"]).toEqual({
      postId: { type: "many2one", target: "posts" },
      userId: {
        type: "many2one",
        target: "users",
        foreignKey: "userId",
        carDirect: "1..1",
        carInverse: "0..n",
        nested: true,
      },
      categoryId: { type: "many2one", target: "categories", carDirect: "1..1", carInverse: "0..n" },
    });
  });
});

// ── Invalid / malformed DSL — silently skipped ────────────────────────────────

describe("invalid or malformed DSL — graceful skip", () => {
  it("unknown type alias is skipped", () => {
    expect(def({ userId: "x2y:users" })).toEqual({});
  });

  it("m2m without pivot parens is skipped", () => {
    expect(def({ tags: "m2m:tags@post_tags" })).toEqual({});
  });

  it("m2m without through table is skipped", () => {
    expect(def({ tags: "m2m:tags(postId,tagId)" })).toEqual({});
  });

  it("empty target is skipped", () => {
    expect(def({ userId: "m2o:" })).toEqual({});
  });

  it("null value is skipped", () => {
    expect(def({ userId: null })).toEqual({});
  });

  it("number value is skipped", () => {
    expect(def({ userId: 42 })).toEqual({});
  });

  it("object without _type defaults to many2one if _target present", () => {
    expect(def({ userId: { _target: "users" } })).toEqual({
      userId: { type: "many2one", target: "users" },
    });
  });

  it("object without _target is skipped", () => {
    expect(def({ userId: { _type: "many2one" } })).toEqual({});
  });
});

// ── Full block — multiple collections ─────────────────────────────────────────

describe("full _rel block with multiple collections", () => {
  it("parses a realistic transfer-booking _rel block", () => {
    const result = parseRelations({
      bookings: {
        customerId: "m2o:customers[1..1->0..n]",
        routeId: "m2o:routes[1..1->0..n]",
        extras: "m2m:extras@booking_extras(bookingId,extraId)[0..n->0..n]",
      },
      payments: {
        bookingId: "m2o:bookings[1..1->1..n]",
      },
      customer_profiles: {
        customerId: "o2o:customers[1..1->1..1]",
      },
    });

    expect(result["bookings"]).toEqual({
      customerId: { type: "many2one", target: "customers", carDirect: "1..1", carInverse: "0..n" },
      routeId: { type: "many2one", target: "routes", carDirect: "1..1", carInverse: "0..n" },
      extras: {
        type: "many2many",
        target: "extras",
        through: "booking_extras",
        foreignKey: "bookingId",
        otherKey: "extraId",
        carDirect: "0..n",
        carInverse: "0..n",
      },
    });
    expect(result["payments"]).toEqual({
      bookingId: { type: "many2one", target: "bookings", carDirect: "1..1", carInverse: "1..n" },
    });
    expect(result["customer_profiles"]).toEqual({
      customerId: { type: "one2one", target: "customers", carDirect: "1..1", carInverse: "1..1" },
    });
  });
});
