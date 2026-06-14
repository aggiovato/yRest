import { watchFile } from "node:fs";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import { createYrestStorage } from "../../storage/yrestStorage.js";
import { createYrestServerFromStorage } from "../../server/index.js";
import { yrestOptionsSchema } from "../../config/loadOptions.js";
import { loadConfigFile } from "../../config/loadConfigFile.js";
import { loadHandlers } from "../../utils/handlers.js";

/**
 * Registers the `serve` command with the CLI program.
 *
 * Loads options from three sources in ascending priority:
 * schema defaults → `yrest.config.yml` → explicit CLI flags.
 * Only flags the user explicitly provided override the config file.
 *
 * @param program - The root Commander program instance.
 */
export function registerServe(program: Command): void {
  program
    .command("serve")
    .description("Start the mock server using a YAML file as database")
    .argument("[file]", "Path to the YAML database file", "db.yml")
    .option("-p, --port <number>", "Port to listen on", "3070")
    .option("-H, --host <host>", "Host to bind", "localhost")
    .option("-b, --base <path>", "Base path prefix for all routes", "")
    .option("-w, --watch", "Reload db.yml automatically when it changes on disk")
    .option("-r, --readonly", "Reject all write operations (POST, PUT, PATCH, DELETE) with 405")
    .option(
      "-d, --delay <ms>",
      "Add a fixed delay (ms) to all responses to simulate network latency",
      "0"
    )
    .option(
      "--pageable [limit]",
      "Wrap GET collection responses in { data, pagination } envelope. Optionally set default page size (default: 10)"
    )
    .option(
      "--snapshot",
      "Save a snapshot of the initial database state and expose /_snapshot endpoints"
    )
    .option(
      "--handlers <file>",
      "Path to a JavaScript file exporting custom route handler functions"
    )
    .option(
      "--id-strategy <strategy>",
      "Id generation strategy for new items: increment (default) or uuid",
      "increment"
    )
    .action(async (file: string, flags: Record<string, string | boolean>, cmd: Command) => {
      const fileConfig = loadConfigFile(join(process.cwd(), "yrest.config.yml"));

      // Only apply CLI values explicitly set by the user; defaults must not shadow the config file.
      const cliOverrides = Object.fromEntries(
        Object.entries(flags).filter(([key]) => cmd.getOptionValueSource(key) === "cli")
      );

      const merged = {
        file,
        ...fileConfig,
        ...(cmd.args.length > 0 ? { file } : {}),
        ...cliOverrides,
      };

      const options = yrestOptionsSchema.parse(merged);

      let storage;
      try {
        storage = createYrestStorage(options.file);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error: cannot load "${options.file}" — ${msg}`);
        process.exit(1);
      }

      const handlers = options.handlers ? await loadHandlers(resolve(options.handlers)) : new Map();

      const yrestServer = createYrestServerFromStorage(storage, options, handlers);
      await yrestServer.start();

      const collections = Object.keys(storage.getData());
      const customRoutes = storage.getRoutes();
      const base = options.base || "/";

      const b = (s: string) => `\x1b[1m${s}\x1b[0m`;
      const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
      const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
      const methodStr = (m: string) => {
        const colors: Record<string, string> = {
          GET: "\x1b[32m",
          POST: "\x1b[33m",
          PUT: "\x1b[34m",
          PATCH: "\x1b[36m",
          DELETE: "\x1b[31m",
        };
        const u = m.toUpperCase();
        return `${colors[u] ?? ""}${u.padEnd(7)}\x1b[0m`;
      };

      console.log(
        `\n  ${b("yrest")}  ${dim("·")}  ${green(`http://${options.host}:${yrestServer.port}`)}\n`
      );

      console.log(`  ${b("Collections")} ${dim(`(base: ${base})`)}:`);
      for (const name of collections) {
        console.log(`    ${dim("CRUD")}  ${options.base}/${name}`);
      }

      console.log(`\n  ${b("Meta")}:`);
      console.log(`    ${methodStr("GET")}${dim("/_about")}`);
      if (options.snapshot) {
        console.log(`    ${methodStr("GET")}${dim("/_snapshot")}`);
        console.log(`    ${methodStr("POST")}${dim("/_snapshot/save")}`);
        console.log(`    ${methodStr("POST")}${dim("/_snapshot/reset")}`);
      }

      if (customRoutes.length > 0) {
        console.log(`\n  ${b("Custom routes")}:`);
        for (const route of customRoutes) {
          const method = (route.method ?? "GET").toUpperCase();
          const label = route.handler ? dim(`→ ${route.handler}()`) : "";
          console.log(`    ${methodStr(method)}${options.base}${route.path}  ${label}`);
        }
      }

      if (handlers.size > 0) {
        console.log(`\n  ${b("Handlers")} ${dim(`(${options.handlers})`)}:`);
        for (const name of handlers.keys()) {
          console.log(`    ${dim("fn")}     ${name}`);
        }
      }

      const modes: string[] = [];
      if (options.readonly) modes.push("readonly");
      if (options.delay > 0) modes.push(`delay ${options.delay}ms`);
      if (options.pageable.enabled) modes.push(`pageable (limit ${options.pageable.limit})`);
      if (options.snapshot) modes.push("snapshot");
      if (modes.length > 0) console.log(`\n  ${dim(modes.map((m) => `[${m}]`).join("  "))}`);

      console.log("");

      if (options.watch) {
        const absFile = resolve(options.file);
        let debounce: ReturnType<typeof setTimeout> | undefined;

        watchFile(absFile, { interval: 300 }, (curr, prev) => {
          if (curr.mtimeMs === prev.mtimeMs) return;
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            try {
              storage.reload();
              console.log(`  \x1b[2m[watch] reloaded ${options.file}\x1b[0m`);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              console.error(`  \x1b[31m[watch] failed to reload ${options.file} — ${msg}\x1b[0m`);
            }
          }, 100);
        });

        console.log(`  \x1b[2m[watch] watching ${options.file} for changes\x1b[0m\n`);
      }
    });
}
