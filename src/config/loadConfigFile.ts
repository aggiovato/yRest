import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";

/**
 * Reads and parses a `yrest.config.yml` file from the given absolute path.
 *
 * Returns an empty object if the file does not exist, so callers can safely
 * spread the result without checking for `undefined`.
 *
 * @param configPath - Absolute path to the config file.
 * @returns Parsed YAML as a plain object, or `{}` if the file is absent.
 */
export function loadConfigFile(configPath: string): Record<string, unknown> {
  if (!existsSync(configPath)) return {};
  const raw = readFileSync(configPath, "utf8");
  return (parse(raw) as Record<string, unknown>) ?? {};
}
