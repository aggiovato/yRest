import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { loadConfigFile } from "../src/config/loadConfigFile";

function tmpConfig(content: string): string {
  const path = join(tmpdir(), `yrest-config-${randomUUID()}.yml`);
  writeFileSync(path, content, "utf8");
  return path;
}

describe("loadConfigFile", () => {
  const paths: string[] = [];
  afterEach(() => {
    for (const p of paths.splice(0)) if (existsSync(p)) unlinkSync(p);
  });

  it("returns empty object when file does not exist", () => {
    const result = loadConfigFile("/nonexistent/path/yrest.config.yml");
    expect(result).toEqual({});
  });

  it("parses port and host", () => {
    const p = tmpConfig("port: 4000\nhost: 0.0.0.0\n");
    paths.push(p);
    const result = loadConfigFile(p);
    expect(result.port).toBe(4000);
    expect(result.host).toBe("0.0.0.0");
  });

  it("parses all known options", () => {
    const p = tmpConfig(
      "file: custom.yml\nport: 8080\nhost: 0.0.0.0\nbase: /api\nreadonly: true\ndelay: 500\nwatch: true\n"
    );
    paths.push(p);
    const result = loadConfigFile(p);
    expect(result).toMatchObject({
      file: "custom.yml",
      port: 8080,
      host: "0.0.0.0",
      base: "/api",
      readonly: true,
      delay: 500,
      watch: true,
    });
  });

  it("returns empty object for empty file", () => {
    const p = tmpConfig("");
    paths.push(p);
    expect(loadConfigFile(p)).toEqual({});
  });

  it("handles partial config (only port)", () => {
    const p = tmpConfig("port: 9000\n");
    paths.push(p);
    const result = loadConfigFile(p);
    expect(result.port).toBe(9000);
    expect(result.host).toBeUndefined();
  });
});
