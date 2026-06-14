/**
 * Security tests — handler path validation in loadHandlers()
 *
 * Verifies that dynamic import() is restricted to safe file extensions.
 * Without this guard an attacker who controls the YAML file could load
 * arbitrary server-side code (e.g. a .ts file that executes compile-time
 * code, a .py script launched via some rogue Node integration, etc.).
 *
 * Guard in src/utils/handlers.ts:
 *   const ALLOWED_EXTENSIONS = [".js", ".mjs", ".cjs"];
 *   if (!ALLOWED_EXTENSIONS.some(ext => filePath.endsWith(ext))) return new Map();
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadHandlers } from "../../src/utils/handlers";

// ── Helpers ───────────────────────────────────────────────────────────────────

function tmp(name: string, content = ""): string {
  const p = join(tmpdir(), name);
  writeFileSync(p, content, "utf8");
  return p;
}

function rmIfExists(p: string) {
  if (existsSync(p)) unlinkSync(p);
}

// ── Fixture files created once ────────────────────────────────────────────────

let jsFile: string;
let mjsFile: string;
let cjsFile: string;
let tsFile: string;
let pyFile: string;
let shFile: string;
let phpFile: string;
let noExtFile: string;

beforeAll(() => {
  // Allowed — valid JS handler
  jsFile = tmp("yrest-sec-test.js", `export function myHandler() { return { status: 200 }; }`);
  mjsFile = tmp("yrest-sec-test.mjs", `export function mjsHandler() { return { status: 201 }; }`);
  cjsFile = tmp(
    "yrest-sec-test.cjs",
    `exports.cjsHandler = function() { return { status: 202 }; }`
  );

  // Rejected — wrong extensions
  tsFile = tmp("yrest-sec-test.ts", `export function tsHandler() { return { status: 200 }; }`);
  pyFile = tmp("yrest-sec-test.py", `print("attack")`);
  shFile = tmp("yrest-sec-test.sh", `#!/bin/bash\nrm -rf /`);
  phpFile = tmp("yrest-sec-test.php", `<?php system($_GET['cmd']); ?>`);
  noExtFile = tmp("yrest-sec-test", `export function noExt() { return { status: 200 }; }`);
});

afterAll(() => {
  [jsFile, mjsFile, cjsFile, tsFile, pyFile, shFile, phpFile, noExtFile].forEach(rmIfExists);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("security — handler path extension whitelist", () => {
  describe("blocked extensions — return empty map without loading", () => {
    it("rejects .ts files", async () => {
      const map = await loadHandlers(tsFile);
      expect(map.size).toBe(0);
    });

    it("rejects .py files", async () => {
      const map = await loadHandlers(pyFile);
      expect(map.size).toBe(0);
    });

    it("rejects .sh files", async () => {
      const map = await loadHandlers(shFile);
      expect(map.size).toBe(0);
    });

    it("rejects .php files", async () => {
      const map = await loadHandlers(phpFile);
      expect(map.size).toBe(0);
    });

    it("rejects files with no extension", async () => {
      const map = await loadHandlers(noExtFile);
      expect(map.size).toBe(0);
    });

    it("does not throw for any rejected extension", async () => {
      await expect(loadHandlers(tsFile)).resolves.not.toThrow();
      await expect(loadHandlers(pyFile)).resolves.not.toThrow();
      await expect(loadHandlers(shFile)).resolves.not.toThrow();
    });
  });

  describe("allowed extensions — load and expose exported functions", () => {
    it("loads .js files and exposes exported functions", async () => {
      const map = await loadHandlers(jsFile);
      expect(map.size).toBeGreaterThan(0);
      expect(map.has("myHandler")).toBe(true);
      expect(typeof map.get("myHandler")).toBe("function");
    });

    it("loads .mjs files and exposes exported functions", async () => {
      const map = await loadHandlers(mjsFile);
      expect(map.size).toBeGreaterThan(0);
      expect(map.has("mjsHandler")).toBe(true);
    });

    it("loads .cjs files and exposes exported functions", async () => {
      const map = await loadHandlers(cjsFile);
      expect(map.size).toBeGreaterThan(0);
      expect(map.has("cjsHandler")).toBe(true);
    });
  });

  describe("non-existent files — return empty map silently", () => {
    it("returns empty map for a non-existent .js path without throwing", async () => {
      const map = await loadHandlers("/tmp/does-not-exist-yrest.js");
      expect(map.size).toBe(0);
    });

    it("returns empty map for a non-existent .ts path without throwing", async () => {
      const map = await loadHandlers("/tmp/does-not-exist-yrest.ts");
      // .ts is blocked before the existsSync check — still returns empty map
      expect(map.size).toBe(0);
    });
  });

  describe("extension check is suffix-based — no bypass via double extension", () => {
    let doubleExtFile: string;

    beforeAll(() => {
      // e.g. "evil.sh.cjs" — should be ALLOWED (ends in .cjs)
      // "evil.cjs.sh"  — should be BLOCKED (ends in .sh)
      doubleExtFile = tmp("yrest-sec-double.cjs.sh", `#!/bin/bash\necho attack`);
    });

    afterAll(() => rmIfExists(doubleExtFile));

    it("blocks 'evil.cjs.sh' — final extension .sh is what matters", async () => {
      const map = await loadHandlers(doubleExtFile);
      expect(map.size).toBe(0);
    });
  });
});
