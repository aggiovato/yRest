/**
 * Security tests — ReDoS via ?field_regex=
 *
 * Verifies that the _regex query operator is protected against:
 *  1. Length-based guard: patterns longer than 200 chars are rejected before
 *     RegExp compilation — prevents attacker-crafted monster patterns.
 *  2. Invalid syntax: malformed patterns are caught and return false — no throw.
 *  3. Catastrophic backtracking: classic ReDoS patterns complete in bounded
 *     time because the length guard rejects long patterns and the try/catch
 *     handles errors. Short catastrophic patterns are a known partial risk
 *     documented here with a timing assertion.
 *
 * All tests run against applyOperator() directly (unit) and via the live
 * server (integration) to cover both layers.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyOperator } from "../../src/services/query.service";
import { createTestServer, cleanup } from "../routes/helpers";
import type { createServer } from "../../src/server/createServer";

// ── Classic ReDoS patterns ────────────────────────────────────────────────────
// These are the canonical catastrophic-backtracking patterns.
// With our length guard they would only be dangerous if < 200 chars.

const REDOS_NESTED_QUANTIFIER = "(a+)+b"; // classic: O(2^n) for "aaaa...c"
const REDOS_ALTERNATION = "(a|aa)+b"; // alternation catastrophe
const REDOS_OVERLAPPING = "([a-zA-Z]+)*c"; // overlapping groups

// A pattern just over the 200-char limit
const LONG_PATTERN = "a".repeat(201);
const PATTERN_AT_LIMIT = "a".repeat(200);

const YAML = `
users:
  - id: 1
    name: Ana
    email: ana@test.com
  - id: 2
    name: Bob
    email: bob@test.com
`;

// ── Unit tests ────────────────────────────────────────────────────────────────

describe("security — ReDoS: applyOperator(_regex) unit", () => {
  describe("length guard (> 200 chars → false without compiling)", () => {
    it("rejects a pattern of 201 chars without throwing", () => {
      expect(() => applyOperator("ana@test.com", "_regex", LONG_PATTERN)).not.toThrow();
      expect(applyOperator("ana@test.com", "_regex", LONG_PATTERN)).toBe(false);
    });

    it("accepts a pattern of exactly 200 chars", () => {
      // 200 'a's matches a string of 'a's
      expect(applyOperator("a".repeat(200), "_regex", PATTERN_AT_LIMIT)).toBe(true);
    });

    it("rejects a 500-char crafted pattern instantly", () => {
      const hugePattern = "(?:" + "a?".repeat(249) + ")";
      const start = Date.now();
      const result = applyOperator("a".repeat(100), "_regex", hugePattern);
      const elapsed = Date.now() - start;
      expect(result).toBe(false);
      // Must complete in well under 10ms — no compilation happened
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe("invalid regex syntax → false, no throw", () => {
    it("handles unclosed bracket [invalid", () => {
      expect(() => applyOperator("test", "_regex", "[invalid")).not.toThrow();
      expect(applyOperator("test", "_regex", "[invalid")).toBe(false);
    });

    it("handles invalid quantifier a{3,1}", () => {
      expect(() => applyOperator("test", "_regex", "a{3,1}")).not.toThrow();
      // Node accepts this as a literal in some versions; either false or true is fine, but no throw
    });

    it("handles null byte in pattern", () => {
      expect(() => applyOperator("test", "_regex", "abc\x00def")).not.toThrow();
    });

    it("handles incomplete escape \\", () => {
      expect(() => applyOperator("test", "_regex", "\\")).not.toThrow();
      expect(applyOperator("test", "_regex", "\\")).toBe(false);
    });
  });

  describe("catastrophic backtracking patterns (short — partial mitigation documented)", () => {
    // These patterns are < 200 chars so they pass the length guard.
    // ReDoS with these requires an adversarial input string.
    // We assert they complete within a generous timeout on typical inputs.

    it(`nested quantifier '${REDOS_NESTED_QUANTIFIER}' on short input completes fast`, () => {
      const start = Date.now();
      // Non-matching input that would cause catastrophic backtracking
      applyOperator("aaaaaaaaaa", "_regex", REDOS_NESTED_QUANTIFIER);
      expect(Date.now() - start).toBeLessThan(100);
    });

    it(`alternation pattern '${REDOS_ALTERNATION}' on short input completes fast`, () => {
      const start = Date.now();
      applyOperator("aaaaaaaaaa", "_regex", REDOS_ALTERNATION);
      expect(Date.now() - start).toBeLessThan(100);
    });

    it(`overlapping groups '${REDOS_OVERLAPPING}' on short input completes fast`, () => {
      const start = Date.now();
      applyOperator("abcdefghij", "_regex", REDOS_OVERLAPPING);
      expect(Date.now() - start).toBeLessThan(100);
    });
  });

  describe("legitimate regex patterns still work", () => {
    it("matches email domain pattern", () => {
      expect(applyOperator("ana@test.com", "_regex", "@test\\.com")).toBe(true);
    });

    it("matches case-insensitive by default", () => {
      expect(applyOperator("AnaLuisa", "_regex", "ana")).toBe(true);
    });

    it("returns false when pattern does not match", () => {
      expect(applyOperator("bob@other.com", "_regex", "@test\\.com")).toBe(false);
    });

    it("supports anchors", () => {
      expect(applyOperator("ana@test.com", "_regex", "^ana")).toBe(true);
      expect(applyOperator("bob@test.com", "_regex", "^ana")).toBe(false);
    });
  });
});

// ── Integration tests ─────────────────────────────────────────────────────────

describe("security — ReDoS: ?field_regex= via live server", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("rejects pattern > 200 chars — returns empty results, not a timeout", async () => {
    const pattern = encodeURIComponent("a".repeat(201));
    const start = Date.now();
    const res = await server.inject({ method: "GET", url: `/users?email_regex=${pattern}` });
    expect(Date.now() - start).toBeLessThan(200);
    expect(res.statusCode).toBe(200);
    // No items match because the guard returned false for all
    expect(res.json()).toHaveLength(0);
  });

  it("invalid pattern does not crash the server", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/users?email_regex=${encodeURIComponent("[unclosed")}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(0);
  });

  it("valid regex pattern still filters correctly after security checks", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/users?email_regex=${encodeURIComponent("@test\\.com")}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { email: string }[];
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((u) => u.email.includes("@test.com"))).toBe(true);
  });

  it("nested quantifier attack pattern on a real endpoint completes in time", async () => {
    const pattern = encodeURIComponent(REDOS_NESTED_QUANTIFIER);
    const start = Date.now();
    await server.inject({ method: "GET", url: `/users?email_regex=${pattern}` });
    expect(Date.now() - start).toBeLessThan(500);
  });
});
