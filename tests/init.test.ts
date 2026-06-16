import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { templates, SAMPLES } from "../src/cli/commands/templates/index";

describe("init templates", () => {
  describe("SAMPLES enum", () => {
    it("contains basic, relational and ecommerce", () => {
      expect(SAMPLES).toContain("basic");
      expect(SAMPLES).toContain("relational");
      expect(SAMPLES).toContain("ecommerce");
    });

    it("every sample has a corresponding template", () => {
      for (const sample of SAMPLES) {
        expect(templates[sample]).toBeDefined();
        expect(typeof templates[sample]).toBe("string");
      }
    });
  });

  describe("basic template", () => {
    it("is valid YAML", () => {
      expect(() => parse(templates.basic)).not.toThrow();
    });

    it("contains users, products and categories collections", () => {
      const data = parse(templates.basic);
      expect(Array.isArray(data.users)).toBe(true);
      expect(Array.isArray(data.products)).toBe(true);
      expect(Array.isArray(data.categories)).toBe(true);
    });

    it("has no _rel block", () => {
      const data = parse(templates.basic);
      expect(data).not.toHaveProperty("_rel");
    });

    it("all items have numeric ids", () => {
      const data = parse(templates.basic);
      const all = [...data.users, ...data.products, ...data.categories];
      expect(all.every((i: { id: unknown }) => typeof i.id === "number")).toBe(true);
    });

    it("users have role and active fields", () => {
      const data = parse(templates.basic);
      for (const user of data.users) {
        expect(user).toHaveProperty("role");
        expect(user).toHaveProperty("active");
      }
    });

    it("products have price and stock fields", () => {
      const data = parse(templates.basic);
      for (const p of data.products) {
        expect(p).toHaveProperty("price");
        expect(p).toHaveProperty("stock");
      }
    });
  });

  describe("relational template", () => {
    it("is valid YAML", () => {
      expect(() => parse(templates.relational)).not.toThrow();
    });

    it("contains users, profiles, posts, post_tags, tags and comments collections", () => {
      const data = parse(templates.relational);
      expect(Array.isArray(data.users)).toBe(true);
      expect(Array.isArray(data.profiles)).toBe(true);
      expect(Array.isArray(data.posts)).toBe(true);
      expect(Array.isArray(data.tags)).toBe(true);
      expect(Array.isArray(data.post_tags)).toBe(true);
      expect(Array.isArray(data.comments)).toBe(true);
    });

    it("has a _rel block", () => {
      const data = parse(templates.relational);
      expect(data).toHaveProperty("_rel");
    });

    it("_rel declares posts → users (many2one shorthand)", () => {
      const data = parse(templates.relational);
      expect(data._rel.posts).toHaveProperty("userId", "users");
    });

    it("_rel declares comments → posts and comments → users (many2one)", () => {
      const data = parse(templates.relational);
      expect(data._rel.comments).toHaveProperty("postId", "posts");
      expect(data._rel.comments).toHaveProperty("userId", "users");
    });

    it("_rel declares profiles → users as one2one", () => {
      const data = parse(templates.relational);
      expect(data._rel.profiles.userId).toMatchObject({ _type: "one2one", _target: "users" });
    });

    it("_rel declares posts ↔ tags as many2many via post_tags", () => {
      const data = parse(templates.relational);
      expect(data._rel.posts.tags).toMatchObject({
        _type: "many2many",
        _target: "tags",
        _through: "post_tags",
        _foreignKey: "postId",
        _otherKey: "tagId",
      });
    });

    it("all posts reference existing user ids", () => {
      const data = parse(templates.relational);
      const userIds = data.users.map((u: { id: number }) => u.id);
      for (const post of data.posts) {
        expect(userIds).toContain(post.userId);
      }
    });

    it("all comments reference existing post ids", () => {
      const data = parse(templates.relational);
      const postIds = data.posts.map((p: { id: number }) => p.id);
      for (const comment of data.comments) {
        expect(postIds).toContain(comment.postId);
      }
    });

    it("all post_tags reference existing post and tag ids", () => {
      const data = parse(templates.relational);
      const postIds = new Set(data.posts.map((p: { id: number }) => p.id));
      const tagIds = new Set(data.tags.map((t: { id: number }) => t.id));
      for (const pt of data.post_tags) {
        expect(postIds.has(pt.postId)).toBe(true);
        expect(tagIds.has(pt.tagId)).toBe(true);
      }
    });

    it("all profiles reference existing user ids", () => {
      const data = parse(templates.relational);
      const userIds = new Set(data.users.map((u: { id: number }) => u.id));
      for (const profile of data.profiles) {
        expect(userIds.has(profile.userId)).toBe(true);
      }
    });
  });

  describe("ecommerce template", () => {
    it("is valid YAML", () => {
      expect(() => parse(templates.ecommerce)).not.toThrow();
    });

    it("contains users, products, categories, orders and order_items collections", () => {
      const data = parse(templates.ecommerce);
      expect(Array.isArray(data.users)).toBe(true);
      expect(Array.isArray(data.products)).toBe(true);
      expect(Array.isArray(data.categories)).toBe(true);
      expect(Array.isArray(data.product_categories)).toBe(true);
      expect(Array.isArray(data.orders)).toBe(true);
      expect(Array.isArray(data.order_items)).toBe(true);
    });

    it("has _rel and _routes blocks", () => {
      const data = parse(templates.ecommerce);
      expect(data).toHaveProperty("_rel");
      expect(Array.isArray(data._routes)).toBe(true);
    });

    it("_rel declares orders → users (many2one)", () => {
      const data = parse(templates.ecommerce);
      expect(data._rel.orders).toHaveProperty("userId", "users");
    });

    it("_rel declares products ↔ categories as many2many", () => {
      const data = parse(templates.ecommerce);
      expect(data._rel.products.categories).toMatchObject({
        _type: "many2many",
        _target: "categories",
        _through: "product_categories",
        _foreignKey: "productId",
        _otherKey: "categoryId",
      });
    });

    it("_routes includes login, featured, summary, cancel and error routes", () => {
      const data = parse(templates.ecommerce);
      const paths = data._routes.map((r: { _path: string }) => r._path);
      expect(paths).toContain("/auth/login");
      expect(paths).toContain("/store/featured");
      expect(paths).toContain("/products/:id/summary");
      expect(paths).toContain("/orders/:id/cancel");
      expect(paths).toContain("/store/inventory/sync");
    });

    it("login route has scenarios and otherwise", () => {
      const data = parse(templates.ecommerce);
      const login = data._routes.find((r: { _path: string }) => r._path === "/auth/login");
      expect(login).toBeDefined();
      expect(Array.isArray(login._scenarios)).toBe(true);
      expect(login._scenarios.length).toBeGreaterThanOrEqual(2);
      expect(login).toHaveProperty("_otherwise");
    });

    it("cancel route has delay", () => {
      const data = parse(templates.ecommerce);
      const cancel = data._routes.find((r: { _path: string }) => r._path === "/orders/:id/cancel");
      expect(cancel).toBeDefined();
      expect(typeof cancel._delay).toBe("number");
      expect(cancel._delay).toBeGreaterThan(0);
    });

    it("inventory/sync route has error injection", () => {
      const data = parse(templates.ecommerce);
      const sync = data._routes.find((r: { _path: string }) => r._path === "/store/inventory/sync");
      expect(sync).toBeDefined();
      expect(sync._error).toBe(503);
    });

    it("all product_categories reference existing ids", () => {
      const data = parse(templates.ecommerce);
      const productIds = new Set(data.products.map((p: { id: number }) => p.id));
      const categoryIds = new Set(data.categories.map((c: { id: number }) => c.id));
      for (const pc of data.product_categories) {
        expect(productIds.has(pc.productId)).toBe(true);
        expect(categoryIds.has(pc.categoryId)).toBe(true);
      }
    });

    it("all order_items reference existing order and product ids", () => {
      const data = parse(templates.ecommerce);
      const orderIds = new Set(data.orders.map((o: { id: number }) => o.id));
      const productIds = new Set(data.products.map((p: { id: number }) => p.id));
      for (const item of data.order_items) {
        expect(orderIds.has(item.orderId)).toBe(true);
        expect(productIds.has(item.productId)).toBe(true);
      }
    });
  });
});
