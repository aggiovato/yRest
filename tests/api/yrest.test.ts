import { describe, it, expect } from "vitest";
import { yrest } from "../../src/api/yrest";

describe("yrest tagged template literal", () => {
  describe("basic parsing", () => {
    it("parses a simple collection", () => {
      const data = yrest`
        users:
          - id: 1
            name: Ana
      `;

      expect(data).toEqual({
        users: [{ id: 1, name: "Ana" }],
      });
    });

    it("parses multiple collections", () => {
      const data = yrest`
        users:
          - id: 1
            name: Ana
        posts:
          - id: 1
            title: First post
            userId: 1
      `;

      expect(data.users).toHaveLength(1);
      expect(data.posts).toHaveLength(1);
    });

    it("parses the _rel block alongside collections", () => {
      const data = yrest`
        _rel:
          posts:
            userId: users

        users:
          - id: 1
            name: Ana

        posts:
          - id: 1
            title: First post
            userId: 1
      `;

      expect(data._rel).toEqual({ posts: { userId: "users" } });
      expect(data.users).toHaveLength(1);
      expect(data.posts).toHaveLength(1);
    });

    it("parses a _routes block", () => {
      const data = yrest`
        _routes:
          - method: POST
            path: /login
            response:
              status: 200
              body:
                token: fake-token

        users:
          - id: 1
            name: Ana
      `;

      expect(Array.isArray(data._routes)).toBe(true);
      expect((data._routes as unknown[])[0]).toMatchObject({
        method: "POST",
        path: "/login",
      });
    });
  });

  describe("dedent", () => {
    it("strips common leading indentation", () => {
      const data = yrest`
        users:
          - id: 1
            name: Ana
      `;

      expect(data.users).toEqual([{ id: 1, name: "Ana" }]);
    });

    it("handles templates with no leading indentation", () => {
      const data = yrest`users:
  - id: 1
    name: Ana
`;

      expect(data.users).toEqual([{ id: 1, name: "Ana" }]);
    });

    it("ignores empty lines when computing indentation", () => {
      const data = yrest`
        users:
          - id: 1
            name: Ana

        posts:
          - id: 1
            title: Hello
      `;

      expect(data.users).toHaveLength(1);
      expect(data.posts).toHaveLength(1);
    });
  });

  describe("type preservation", () => {
    it("preserves numeric values", () => {
      const data = yrest`
        users:
          - id: 1
            age: 30
            score: 9.5
      `;

      const user = (data.users as Array<Record<string, unknown>>)[0];
      expect(typeof user.id).toBe("number");
      expect(typeof user.age).toBe("number");
      expect(typeof user.score).toBe("number");
    });

    it("preserves boolean values", () => {
      const data = yrest`
        users:
          - id: 1
            active: true
            verified: false
      `;

      const user = (data.users as Array<Record<string, unknown>>)[0];
      expect(user.active).toBe(true);
      expect(user.verified).toBe(false);
    });

    it("preserves null values", () => {
      const data = yrest`
        users:
          - id: 1
            deletedAt: null
      `;

      const user = (data.users as Array<Record<string, unknown>>)[0];
      expect(user.deletedAt).toBeNull();
    });
  });

  describe("interpolations", () => {
    it("inserts interpolated string values", () => {
      const name = "Ana";
      const data = yrest`
        users:
          - id: 1
            name: ${name}
      `;

      const user = (data.users as Array<Record<string, unknown>>)[0];
      expect(user.name).toBe("Ana");
    });

    it("inserts interpolated numeric values", () => {
      const port = 3070;
      const data = yrest`
        config:
          - port: ${port}
      `;

      const config = (data.config as Array<Record<string, unknown>>)[0];
      expect(config.port).toBe(3070);
    });
  });

  describe("error handling", () => {
    it("throws on invalid YAML with [yrest] prefix", () => {
      expect(
        () =>
          yrest`
          users:
            - id: 1
           bad indent here
        `
      ).toThrow("[yrest]");
    });

    it("throws when template resolves to an array instead of object", () => {
      expect(
        () =>
          yrest`
          - one
          - two
        `
      ).toThrow("[yrest]");
    });

    it("throws when template resolves to a scalar", () => {
      expect(() => yrest`just a string`).toThrow("[yrest]");
    });
  });
});
