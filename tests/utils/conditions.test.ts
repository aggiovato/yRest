import { describe, it, expect } from "vitest";
import { findMatchingScenario } from "../../src/utils/conditions";
import type { Scenario } from "../../src/storage/types";
import type { HandlerRequest } from "../../src/utils/handlers";

function makeReq(overrides: Partial<HandlerRequest> = {}): HandlerRequest {
  return { params: {}, query: {}, body: {}, headers: {}, ...overrides };
}

function scenario(when: Record<string, unknown>): Scenario {
  return { when, response: { status: 200, body: {} } };
}

describe("findMatchingScenario — _-prefixed condition keys", () => {
  describe("_body.*", () => {
    it("matches when all _body.* conditions are satisfied", () => {
      const s = scenario({ "_body.email": "ana@test.com", "_body.password": "secret" });
      const req = makeReq({ body: { email: "ana@test.com", password: "secret" } });
      expect(findMatchingScenario([s], req)).toBe(s);
    });

    it("does not match when a _body.* value differs", () => {
      const s = scenario({ "_body.email": "ana@test.com", "_body.password": "secret" });
      const req = makeReq({ body: { email: "ana@test.com", password: "wrong" } });
      expect(findMatchingScenario([s], req)).toBeUndefined();
    });

    it("does not match when _body.* field is absent", () => {
      const s = scenario({ "_body.role": "admin" });
      const req = makeReq({ body: {} });
      expect(findMatchingScenario([s], req)).toBeUndefined();
    });
  });

  describe("_params.*", () => {
    it("matches when _params.* condition is satisfied", () => {
      const s = scenario({ "_params.id": "42" });
      const req = makeReq({ params: { id: "42" } });
      expect(findMatchingScenario([s], req)).toBe(s);
    });

    it("does not match when _params.* value differs", () => {
      const s = scenario({ "_params.id": "42" });
      const req = makeReq({ params: { id: "99" } });
      expect(findMatchingScenario([s], req)).toBeUndefined();
    });
  });

  describe("_query.*", () => {
    it("matches when _query.* condition is satisfied", () => {
      const s = scenario({ "_query.q": "admin" });
      const req = makeReq({ query: { q: "admin" } });
      expect(findMatchingScenario([s], req)).toBe(s);
    });

    it("does not match when _query.* value differs", () => {
      const s = scenario({ "_query.q": "admin" });
      const req = makeReq({ query: { q: "user" } });
      expect(findMatchingScenario([s], req)).toBeUndefined();
    });

    it("does not match when _query.* field is absent", () => {
      const s = scenario({ "_query.q": "admin" });
      const req = makeReq({ query: {} });
      expect(findMatchingScenario([s], req)).toBeUndefined();
    });
  });

  describe("_headers.*", () => {
    it("matches when _headers.* condition is satisfied", () => {
      const s = scenario({ "_headers.x-api-key": "secret-key" });
      const req = makeReq({ headers: { "x-api-key": "secret-key" } });
      expect(findMatchingScenario([s], req)).toBe(s);
    });

    it("does not match when _headers.* value differs", () => {
      const s = scenario({ "_headers.x-api-key": "secret-key" });
      const req = makeReq({ headers: { "x-api-key": "wrong-key" } });
      expect(findMatchingScenario([s], req)).toBeUndefined();
    });

    it("does not match when header is absent", () => {
      const s = scenario({ "_headers.x-api-key": "secret-key" });
      const req = makeReq({ headers: {} });
      expect(findMatchingScenario([s], req)).toBeUndefined();
    });
  });

  describe("bare and _-prefixed forms are interchangeable", () => {
    it("body.* and _body.* resolve to the same value", () => {
      const bare = scenario({ "body.role": "admin" });
      const prefixed = scenario({ "_body.role": "admin" });
      const req = makeReq({ body: { role: "admin" } });
      expect(findMatchingScenario([bare], req)).toBeDefined();
      expect(findMatchingScenario([prefixed], req)).toBeDefined();
    });

    it("params.* and _params.* resolve to the same value", () => {
      const bare = scenario({ "params.id": "5" });
      const prefixed = scenario({ "_params.id": "5" });
      const req = makeReq({ params: { id: "5" } });
      expect(findMatchingScenario([bare], req)).toBeDefined();
      expect(findMatchingScenario([prefixed], req)).toBeDefined();
    });

    it("query.* and _query.* resolve to the same value", () => {
      const bare = scenario({ "query.page": "2" });
      const prefixed = scenario({ "_query.page": "2" });
      const req = makeReq({ query: { page: "2" } });
      expect(findMatchingScenario([bare], req)).toBeDefined();
      expect(findMatchingScenario([prefixed], req)).toBeDefined();
    });

    it("headers.* and _headers.* resolve to the same value", () => {
      const bare = scenario({ "headers.authorization": "Bearer tok" });
      const prefixed = scenario({ "_headers.authorization": "Bearer tok" });
      const req = makeReq({ headers: { authorization: "Bearer tok" } });
      expect(findMatchingScenario([bare], req)).toBeDefined();
      expect(findMatchingScenario([prefixed], req)).toBeDefined();
    });
  });

  describe("_-prefixed keys with operator suffixes", () => {
    it("_body.name_like matches substring (case-insensitive)", () => {
      const s = scenario({ "_body.name_like": "ana" });
      const req = makeReq({ body: { name: "AnaLuisa" } });
      expect(findMatchingScenario([s], req)).toBe(s);
    });

    it("_body.age_gte matches when value is >= threshold", () => {
      const s = scenario({ "_body.age_gte": "18" });
      const req = makeReq({ body: { age: 20 } });
      expect(findMatchingScenario([s], req)).toBe(s);
    });

    it("_body.age_gte does not match when value is below threshold", () => {
      const s = scenario({ "_body.age_gte": "18" });
      const req = makeReq({ body: { age: 10 } });
      expect(findMatchingScenario([s], req)).toBeUndefined();
    });

    it("_body.role_ne matches when value is not equal", () => {
      const s = scenario({ "_body.role_ne": "user" });
      const req = makeReq({ body: { role: "admin" } });
      expect(findMatchingScenario([s], req)).toBe(s);
    });

    it("_query.q_start matches when value starts with prefix", () => {
      const s = scenario({ "_query.q_start": "adm" });
      const req = makeReq({ query: { q: "admin" } });
      expect(findMatchingScenario([s], req)).toBe(s);
    });
  });

  describe("OR semantics with _-prefixed keys", () => {
    it("matches when any OR group with _body.* is satisfied", () => {
      const s: Scenario = {
        when: [{ "_body.role": "admin" }, { "_body.role": "superadmin" }],
        response: { status: 200, body: {} },
      };
      expect(findMatchingScenario([s], makeReq({ body: { role: "admin" } }))).toBe(s);
      expect(findMatchingScenario([s], makeReq({ body: { role: "superadmin" } }))).toBe(s);
      expect(findMatchingScenario([s], makeReq({ body: { role: "user" } }))).toBeUndefined();
    });
  });
});
