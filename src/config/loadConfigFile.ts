import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";

export function loadConfigFile(configPath: string): Record<string, unknown> {
  if (!existsSync(configPath)) return {};
  const raw = readFileSync(configPath, "utf8");
  return (parse(raw) as Record<string, unknown>) ?? {};
}
