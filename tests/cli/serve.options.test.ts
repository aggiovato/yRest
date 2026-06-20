/**
 * Unit tests for buildServeOptions() — three-layer option merge in the serve command.
 *
 * Priority (ascending): schema defaults → yrest.config.yml → explicit CLI flags.
 * The positional file argument re-asserts over the config file when explicitly set.
 */
import { describe, it, expect } from "vitest";
import { buildServeOptions } from "../../src/cli/commands/serve";

const BASE_FILE = "db.yml";

describe("buildServeOptions — option merge priority", () => {
  describe("schema defaults", () => {
    it("applies default port 3070 when nothing overrides it", () => {
      const opts = buildServeOptions(BASE_FILE, {}, {});
      expect(opts.port).toBe(3070);
    });

    it("applies default host localhost", () => {
      const opts = buildServeOptions(BASE_FILE, {}, {});
      expect(opts.host).toBe("localhost");
    });

    it("applies default empty base", () => {
      const opts = buildServeOptions(BASE_FILE, {}, {});
      expect(opts.base).toBe("");
    });

    it("uses the provided file argument", () => {
      const opts = buildServeOptions("custom.yml", {}, {});
      expect(opts.file).toBe("custom.yml");
    });
  });

  describe("config file overrides defaults", () => {
    it("config file port overrides default", () => {
      const opts = buildServeOptions(BASE_FILE, { port: 4000 }, {});
      expect(opts.port).toBe(4000);
    });

    it("config file host overrides default", () => {
      const opts = buildServeOptions(BASE_FILE, { host: "0.0.0.0" }, {});
      expect(opts.host).toBe("0.0.0.0");
    });

    it("config file base overrides default", () => {
      const opts = buildServeOptions(BASE_FILE, { base: "/api" }, {});
      expect(opts.base).toBe("/api");
    });

    it("config file readonly overrides default", () => {
      const opts = buildServeOptions(BASE_FILE, { readonly: true }, {});
      expect(opts.readonly).toBe(true);
    });

    it("config file delay overrides default", () => {
      const opts = buildServeOptions(BASE_FILE, { delay: 200 }, {});
      expect(opts.delay).toBe(200);
    });
  });

  describe("CLI flags override config file", () => {
    it("CLI port overrides config file port", () => {
      const opts = buildServeOptions(BASE_FILE, { port: 4000 }, { port: "5000" });
      expect(opts.port).toBe(5000);
    });

    it("CLI host overrides config file host", () => {
      const opts = buildServeOptions(BASE_FILE, { host: "0.0.0.0" }, { host: "127.0.0.1" });
      expect(opts.host).toBe("127.0.0.1");
    });

    it("CLI base overrides config file base", () => {
      const opts = buildServeOptions(BASE_FILE, { base: "/api" }, { base: "/v2" });
      expect(opts.base).toBe("/v2");
    });

    it("CLI readonly overrides config file readonly", () => {
      const opts = buildServeOptions(BASE_FILE, { readonly: false }, { readonly: true });
      expect(opts.readonly).toBe(true);
    });
  });

  describe("positional file argument precedence", () => {
    it("config file's file key wins when file arg is implicit (default)", () => {
      // fileArgIsExplicit=false → config file can set the file path
      const opts = buildServeOptions(BASE_FILE, { file: "from-config.yml" }, {}, false);
      expect(opts.file).toBe("from-config.yml");
    });

    it("explicit positional arg wins over config file's file key", () => {
      // fileArgIsExplicit=true → positional arg re-asserts after config merge
      const opts = buildServeOptions("explicit.yml", { file: "from-config.yml" }, {}, true);
      expect(opts.file).toBe("explicit.yml");
    });
  });

  describe("base path normalisation (via schema)", () => {
    it("adds leading slash to base without one", () => {
      const opts = buildServeOptions(BASE_FILE, {}, { base: "api" });
      expect(opts.base).toBe("/api");
    });

    it("keeps base that already has leading slash", () => {
      const opts = buildServeOptions(BASE_FILE, {}, { base: "/v1" });
      expect(opts.base).toBe("/v1");
    });
  });

  describe("full three-layer merge", () => {
    it("all three layers applied in correct order", () => {
      const opts = buildServeOptions(
        BASE_FILE,
        { port: 4000, host: "0.0.0.0", delay: 100 },
        { port: "5000" } // only port overridden by CLI
      );
      expect(opts.port).toBe(5000); // CLI wins
      expect(opts.host).toBe("0.0.0.0"); // config file wins over default
      expect(opts.delay).toBe(100); // config file wins over default
    });
  });

  describe("invalid options throw", () => {
    it("throws when file is empty string", () => {
      expect(() => buildServeOptions("", {}, {})).toThrow();
    });
  });
});
