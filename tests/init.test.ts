import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { templates, SAMPLES } from "../src/cli/commands/templates/index";

describe("init templates", () => {
  describe("SAMPLES enum", () => {
    it("contains basic and relational", () => {
      expect(SAMPLES).toContain("basic");
      expect(SAMPLES).toContain("relational");
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

    it("contains users and products collections", () => {
      const data = parse(templates.basic);
      expect(Array.isArray(data.users)).toBe(true);
      expect(Array.isArray(data.products)).toBe(true);
    });

    it("has no _rel block", () => {
      const data = parse(templates.basic);
      expect(data).not.toHaveProperty("_rel");
    });

    it("all items have numeric ids", () => {
      const data = parse(templates.basic);
      const all = [...data.users, ...data.products];
      expect(all.every((i: { id: unknown }) => typeof i.id === "number")).toBe(true);
    });
  });

  describe("relational template", () => {
    it("is valid YAML", () => {
      expect(() => parse(templates.relational)).not.toThrow();
    });

    it("contains users, posts and comments collections", () => {
      const data = parse(templates.relational);
      expect(Array.isArray(data.users)).toBe(true);
      expect(Array.isArray(data.posts)).toBe(true);
      expect(Array.isArray(data.comments)).toBe(true);
    });

    it("has a _rel block", () => {
      const data = parse(templates.relational);
      expect(data).toHaveProperty("_rel");
    });

    it("_rel declares posts → users relation", () => {
      const data = parse(templates.relational);
      expect(data._rel.posts).toHaveProperty("userId", "users");
    });

    it("_rel declares comments → posts relation", () => {
      const data = parse(templates.relational);
      expect(data._rel.comments).toHaveProperty("postId", "posts");
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
  });
});
