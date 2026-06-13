import { describe, it, expect } from "vitest";
import { yrestOptionsSchema } from "../src/config/loadOptions";

describe("yrestOptionsSchema", () => {
  it("applies default port 3070", () => {
    const result = yrestOptionsSchema.parse({ file: "db.yml" });
    expect(result.port).toBe(3070);
  });

  it("applies default host localhost", () => {
    const result = yrestOptionsSchema.parse({ file: "db.yml" });
    expect(result.host).toBe("localhost");
  });

  it("applies default empty base", () => {
    const result = yrestOptionsSchema.parse({ file: "db.yml" });
    expect(result.base).toBe("");
  });

  it("coerces port string to number", () => {
    const result = yrestOptionsSchema.parse({ file: "db.yml", port: "3001" });
    expect(result.port).toBe(3001);
  });

  it("adds leading slash to base path", () => {
    const result = yrestOptionsSchema.parse({ file: "db.yml", base: "api" });
    expect(result.base).toBe("/api");
  });

  it("keeps base path that already has leading slash", () => {
    const result = yrestOptionsSchema.parse({ file: "db.yml", base: "/api" });
    expect(result.base).toBe("/api");
  });

  it("rejects empty file", () => {
    expect(() => yrestOptionsSchema.parse({ file: "" })).toThrow();
  });
});
