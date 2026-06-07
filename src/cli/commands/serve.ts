import { watchFile } from "node:fs";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import { createYamlStorage } from "../../storage/yamlStorage.js";
import { createServer } from "../../server/createServer.js";
import { serverOptionsSchema } from "../../config/loadOptions.js";
import { loadConfigFile } from "../../config/loadConfigFile.js";

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
    .action(async (file: string, flags: Record<string, string | boolean>, cmd: Command) => {
      const fileConfig = loadConfigFile(join(process.cwd(), "yrest.config.yml"));

      // Only apply CLI values that were explicitly set by the user (not defaults)
      const cliOverrides = Object.fromEntries(
        Object.entries(flags).filter(([key]) => cmd.getOptionValueSource(key) === "cli")
      );

      const merged = {
        file,
        ...fileConfig,
        ...(cmd.args.length > 0 ? { file } : {}),
        ...cliOverrides,
      };

      const options = serverOptionsSchema.parse(merged);

      const storage = createYamlStorage(options.file);
      const server = await createServer(storage, options);

      await server.listen({ port: options.port, host: options.host });

      const collections = Object.keys(storage.getData());
      const baseLabel = options.base || "/";

      console.log(`\nyrest running at http://${options.host}:${options.port}`);
      if (options.readonly) console.log("[readonly] write operations are disabled");
      if (options.delay > 0) console.log(`[delay] ${options.delay}ms added to all responses`);
      console.log(`\nResources (base: ${baseLabel}):`);
      for (const name of collections) {
        console.log(`  /${name}`);
      }
      console.log("");

      if (flags["watch"]) {
        const absFile = resolve(options.file);
        let debounce: ReturnType<typeof setTimeout> | undefined;

        watchFile(absFile, { interval: 300 }, (curr, prev) => {
          if (curr.mtimeMs === prev.mtimeMs) return;
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            try {
              storage.reload();
              console.log(`[watch] reloaded ${options.file}`);
            } catch {
              console.error(`[watch] failed to reload ${options.file} — check YAML syntax`);
            }
          }, 100);
        });

        console.log(`[watch] watching ${options.file} for changes\n`);
      }
    });
}
