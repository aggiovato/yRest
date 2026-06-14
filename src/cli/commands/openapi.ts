import type { Command } from "commander";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringify } from "yaml";
import { createYrestStorage } from "../../storage/yrestStorage.js";
import { yrestOptionsSchema } from "../../config/loadOptions.js";
import { generateOpenApi } from "../../openapi/generateOpenApi.js";

export function registerOpenApi(program: Command): void {
  program
    .command("openapi <file>")
    .description("Generate an OpenAPI 3.0 spec from a db.yml file")
    .option("-o, --output <file>", "Output file (default: openapi.yaml / openapi.json)")
    .option("--format <fmt>", "Output format: yaml (default) or json", "yaml")
    .option("--stdout", "Print to stdout instead of writing a file")
    .option("--base <base>", "Base path prefix applied to all routes", "")
    .option("--port <port>", "Server port shown in the servers block", "3070")
    .option("--host <host>", "Server host shown in the servers block", "localhost")
    .option("--title <title>", "API title for the info block", "yRest API")
    .action((file: string, opts: Record<string, string>) => {
      const storage = createYrestStorage(resolve(file));

      const options = yrestOptionsSchema.parse({
        file,
        base: opts["base"] || undefined,
        port: Number(opts["port"]) || 3070,
        host: opts["host"] || "localhost",
      });

      const doc = generateOpenApi(storage, options, opts["title"]);

      const isJson = opts["format"] === "json";
      const output = isJson
        ? JSON.stringify(doc, null, 2)
        : stringify(doc, { lineWidth: 0, aliasDuplicateObjects: false });

      if (opts["stdout"]) {
        process.stdout.write(output);
        return;
      }

      const defaultFile = isJson ? "openapi.json" : "openapi.yaml";
      const outFile = resolve(opts["output"] ?? defaultFile);
      writeFileSync(outFile, output, "utf8");
      console.log(`✓  OpenAPI spec written to ${outFile}`);
    });
}
