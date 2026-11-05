import { describe, it, expect } from "vitest";
import { addRouteEntry } from "../../src/cli/commands/handler";
import { parseRoutes } from "../../src/storage/parseRoutes";

describe("yrest handler --register — addRouteEntry", () => {
  it("adds a route with _-prefixed keys that parseRoutes reads", () => {
    const raw: Record<string, unknown> = { users: [] };
    expect(addRouteEntry(raw, "login", "post", "/login")).toBe(true);
    expect(raw["_routes"]).toEqual([{ _method: "POST", _path: "/login", _handler: "login" }]);
    expect(parseRoutes(raw["_routes"])).toEqual([
      { method: "POST", path: "/login", handler: "login" },
    ]);
  });

  it("appends to existing _routes", () => {
    const raw: Record<string, unknown> = {
      _routes: [{ _method: "GET", _path: "/me", _handler: "me" }],
    };
    addRouteEntry(raw, "login", "POST", "/login");
    expect(raw["_routes"]).toHaveLength(2);
  });

  it("skips a handler that is already registered, with either key form", () => {
    const current = { _routes: [{ _method: "POST", _path: "/login", _handler: "login" }] };
    expect(addRouteEntry(current, "login", "POST", "/login")).toBe(false);
    const legacy = { _routes: [{ method: "POST", path: "/login", handler: "login" }] };
    expect(addRouteEntry(legacy, "login", "POST", "/login")).toBe(false);
    expect(legacy._routes).toHaveLength(1);
  });
});
