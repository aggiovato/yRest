import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { parse, stringify } from "yaml";
import type { Command } from "commander";
import { loadConfigFile } from "../../config/loadConfigFile.js";

const JS_HEADER = `// yrest handlers — loaded via "handlers:" in yrest.config.yml
// Handler signature: (req: HandlerRequest, ctx: HandlerContext) => HandlerResponse | Promise<HandlerResponse>
// See https://github.com/aggiovato/yRest for full documentation
`;

const TS_HEADER = `// yrest handlers — loaded via "handlers:" in yrest.config.yml
// TypeScript handlers need Node >= 22.18 (built-in type stripping) or running yrest through tsx.
// See https://github.com/aggiovato/yRest for full documentation
import { defineHandler } from "@yrest/cli";
`;

/** Whether a handlers file path is TypeScript (gets `defineHandler` stubs). */
export function isTypeScriptFile(filePath: string): boolean {
  return filePath.endsWith(".ts") || filePath.endsWith(".mts");
}

/** Header written when the handlers file is created. */
export function handlersFileHeader(typescript: boolean): string {
  return typescript ? TS_HEADER : JS_HEADER;
}

/** Whether the handlers file content already defines `name` (function or const form). */
export function hasHandler(content: string, name: string): boolean {
  return content.includes(`function ${name}(`) || new RegExp(`\\bconst ${name}\\s*=`).test(content);
}

/** Builds a handler stub: a JSDoc-typed function for JS, a `defineHandler` const for TS. */
export function buildStub(
  name: string,
  method?: string,
  path?: string,
  typescript = false
): string {
  const tag =
    method && path ? `Handler for ${method.toUpperCase()} ${path}` : `yrest handler function`;
  if (typescript) {
    return [
      "",
      `/** ${tag} */`,
      `export const ${name} = defineHandler(async (req, ctx) => {`,
      `  // TODO: implement handler logic — ctx.collection("name") gives typed access to the data`,
      `  return { status: 200, body: null };`,
      `});`,
      "",
    ].join("\n");
  }
  return [
    "",
    `/**`,
    ` * ${tag}`,
    ` * @param {import('@yrest/cli').HandlerRequest} req`,
    ` * @param {import('@yrest/cli').HandlerContext} ctx`,
    ` * @returns {Promise<import('@yrest/cli').HandlerResponse>}`,
    ` */`,
    `export async function ${name}(req, ctx) {`,
    `  // TODO: implement handler logic — ctx.collection("name") gives access to the data`,
    `  return { status: 200, body: null };`,
    `}`,
    "",
  ].join("\n");
}

/**
 * Adds a `_routes` entry linking `name` to `method` + `path` in a parsed db.yml root,
 * using the `_`-prefixed keys that `parseRoutes` reads.
 *
 * @returns `false` (and leaves `raw` untouched) when a route already uses this handler.
 */
export function addRouteEntry(
  raw: Record<string, unknown>,
  name: string,
  method: string,
  path: string
): boolean {
  if (!Array.isArray(raw["_routes"])) raw["_routes"] = [];
  const routes = raw["_routes"] as Array<Record<string, unknown>>;
  // `handler` (bare key) is what older versions of this command wrote.
  if (routes.some((r) => r["_handler"] === name || r["handler"] === name)) return false;
  routes.push({ _method: method.toUpperCase(), _path: path, _handler: name });
  return true;
}

/**
 * Registers the `handler` command with the CLI program.
 *
 * Scaffolds a named handler function stub into the configured handlers file
 * (`handlers:` in `yrest.config.yml`, or `./yrest.handlers.js` by default).
 * With `--register`, also adds a `_routes` entry to the YAML database file.
 *
 * @param program - The root Commander program instance.
 */
export function registerHandler(program: Command): void {
  program
    .command("handler")
    .description("Scaffold a handler function stub in the handlers file")
    .argument("<name>", "Name of the handler function to create")
    .option("-m, --method <method>", "HTTP method hint for the stub JSDoc (e.g. POST)")
    .option("-p, --path <path>", "Route path hint for the stub JSDoc (e.g. /login)")
    .option(
      "--register",
      "Also add a _routes entry to db.yml linking this handler to method + path"
    )
    .action((name: string, flags: { method?: string; path?: string; register?: boolean }) => {
      const fileConfig = loadConfigFile(join(process.cwd(), "yrest.config.yml"));
      const handlersPath = resolve(
        (fileConfig.handlers as string | undefined) ?? "yrest.handlers.js"
      );
      const dbPath = resolve((fileConfig.file as string | undefined) ?? "db.yml");

      // ── Write stub to handlers file ─────────────────────────────────────────
      const typescript = isTypeScriptFile(handlersPath);
      const stub = buildStub(name, flags.method, flags.path, typescript);
      if (!existsSync(handlersPath)) {
        writeFileSync(handlersPath, handlersFileHeader(typescript) + stub, "utf8");
        console.log(`  Created ${basename(handlersPath)}`);
      } else {
        const existing = readFileSync(handlersPath, "utf8");
        if (hasHandler(existing, name)) {
          console.error(`  Error: handler "${name}" already exists in ${basename(handlersPath)}`);
          process.exit(1);
        }
        appendFileSync(handlersPath, stub, "utf8");
        console.log(`  Added handler "${name}" to ${basename(handlersPath)}`);
      }

      // ── Optionally register in db.yml ────────────────────────────────────────
      if (flags.register) {
        if (!flags.method || !flags.path) {
          console.error("  Error: --register requires --method and --path");
          process.exit(1);
        }
        if (!existsSync(dbPath)) {
          console.error(`  Error: database file not found at ${dbPath}`);
          process.exit(1);
        }
        const raw = (parse(readFileSync(dbPath, "utf8")) ?? {}) as Record<string, unknown>;
        if (addRouteEntry(raw, name, flags.method, flags.path)) {
          writeFileSync(dbPath, stringify(raw), "utf8");
          console.log(`  Added _routes entry to ${basename(dbPath)}`);
        } else {
          console.log(`  Handler "${name}" already in _routes — skipped`);
        }
      }

      console.log(`\n  Next steps:`);
      if (!fileConfig.handlers) {
        console.log(`    1. Add  handlers: ${basename(handlersPath)}  to yrest.config.yml`);
        console.log(`    2. Implement the "${name}" function in ${basename(handlersPath)}`);
      } else {
        console.log(`    1. Implement the "${name}" function in ${basename(handlersPath)}`);
      }
      if (!flags.register) {
        console.log(
          `    ${fileConfig.handlers ? "2" : "3"}. Add a _routes entry with  handler: ${name}  in your db.yml`
        );
        console.log(`       (or re-run with --register --method <METHOD> --path <path>)`);
      }
    });
}
