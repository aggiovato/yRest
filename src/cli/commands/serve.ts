import type { Command } from "commander";
import { createYamlStorage } from "../../storage/yamlStorage.js";
import { createServer } from "../../server/createServer.js";
import { serverOptionsSchema } from "../../config/loadOptions.js";

export function registerServe(program: Command): void {
  program
    .command("serve <file>")
    .description("Start the mock server using a YAML file as database")
    .option("-p, --port <number>", "Port to listen on", "3070")
    .option("-H, --host <host>", "Host to bind", "localhost")
    .option("-b, --base <path>", "Base path prefix for all routes", "")
    .action(async (file: string, flags: Record<string, string>) => {
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
    });
}
