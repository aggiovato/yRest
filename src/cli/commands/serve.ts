import { watchFile } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import { createYamlStorage } from "../../storage/yamlStorage.js";
import { createServer } from "../../server/createServer.js";
import { serverOptionsSchema } from "../../config/loadOptions.js";

export function registerServe(program: Command): void {
  program
    .command("serve")
    .description("Start the mock server using a YAML file as database")
    .argument("[file]", "Path to the YAML database file", "db.yml")
    .option("-p, --port <number>", "Port to listen on", "3070")
    .option("-H, --host <host>", "Host to bind", "localhost")
    .option("-b, --base <path>", "Base path prefix for all routes", "")
    .option("-w, --watch", "Reload db.yml automatically when it changes on disk")
    .action(async (file: string, flags: Record<string, string | boolean>) => {
      const options = serverOptionsSchema.parse({
        file,
        port: flags["port"],
        host: flags["host"],
        base: flags["base"],
      });

      const storage = createYamlStorage(options.file);
      const server = await createServer(storage, options);

      await server.listen({ port: options.port, host: options.host });

      const collections = Object.keys(storage.getData());
      const baseLabel = options.base || "/";

      console.log(`\nyrest running at http://${options.host}:${options.port}`);
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
