import { describe, it, expect } from "vitest";
import {
  addRouteEntry,
  buildStub,
  handlersFileHeader,
  hasHandler,
  isTypeScriptFile,
} from "../../src/cli/commands/handler";
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

describe("yrest handler — stubs", () => {
  it("detects TypeScript handler files", () => {
    expect(isTypeScriptFile("yrest.handlers.ts")).toBe(true);
    expect(isTypeScriptFile("yrest.handlers.mts")).toBe(true);
    expect(isTypeScriptFile("yrest.handlers.js")).toBe(false);
  });

  it("builds a JSDoc-typed function stub for JS, with ctx", () => {
    const stub = buildStub("login", "post", "/login");
    expect(stub).toContain("Handler for POST /login");
    expect(stub).toContain("export async function login(req, ctx) {");
    expect(stub).toContain("@param {import('@yrest/cli').HandlerContext} ctx");
  });

  it("builds a defineHandler stub for TS and imports it in the header", () => {
    const stub = buildStub("login", "POST", "/login", true);
    expect(stub).toContain("export const login = defineHandler(async (req, ctx) => {");
    expect(handlersFileHeader(true)).toContain('import { defineHandler } from "@yrest/cli";');
    expect(handlersFileHeader(false)).not.toContain("import");
  });

  it("finds an existing handler in either form", () => {
    expect(hasHandler("export async function login(req) {}", "login")).toBe(true);
    expect(hasHandler("export const login = defineHandler(", "login")).toBe(true);
    expect(hasHandler("export const loginUser = defineHandler(", "login")).toBe(false);
    expect(hasHandler("export const login2 = 1", "login")).toBe(false);
  });

  it("generated TS file is valid TypeScript", async () => {
    const ts = (await import("typescript")).default;
    const source = handlersFileHeader(true) + buildStub("login", "POST", "/login", true);
    const { diagnostics } = ts.transpileModule(source, { reportDiagnostics: true });
    expect(diagnostics ?? []).toEqual([]);
  });
});
