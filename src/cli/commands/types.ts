import type { Command } from "commander";
import { readFileSync, writeFileSync, watchFile } from "node:fs";
import { basename, resolve } from "node:path";
import { parse } from "yaml";
import { parseData } from "../../storage/parseData.js";
import { parseSchema } from "../../storage/parseSchema.js";
import { parseRelations } from "../../storage/parseRelations.js";
import { generateTypes } from "../../codegen/generateTypes.js";

/**
 * Reads a db.yml file and returns the generated TypeScript declarations.
 *
 * Parses the raw YAML directly instead of going through `createYrestStorage`, so
 * `__uuid_gen` / `__fk` directives are NOT resolved and the source file is never rewritten.
 */
export function generateTypesFromFile(filePath: string): string {
  const absPath = resolve(filePath);
  const raw = (parse(readFileSync(absPath, "utf8")) ?? {}) as Record<string, unknown>;
  return generateTypes(
    {
      data: parseData(raw),
      schema: parseSchema(raw["_schema"]),
      relations: parseRelations(raw["_rel"]),
    },
    { source: basename(absPath) }
  );
}

export function registerTypes(program: Command): void {
  program
    .command("types <file>")
    .description("Generate TypeScript interfaces from a db.yml file")
    .option("-o, --output <file>", "Write to a file instead of stdout (e.g. db.types.ts)")
    .option("-w, --watch", "Regenerate on every change of <file> (requires --output)")
    .action((file: string, opts: { output?: string; watch?: boolean }) => {
      if (opts.watch && !opts.output) {
        console.error("✗  --watch requires --output");
        process.exitCode = 1;
        return;
      }

      const run = (): boolean => {
        try {
          const output = generateTypesFromFile(file);
          if (!opts.output) {
            process.stdout.write(output);
          } else {
            const outFile = resolve(opts.output);
            writeFileSync(outFile, output, "utf8");
            console.log(`✓  Types written to ${outFile}`);
          }
          return true;
        } catch (err) {
          console.error(`✗  Could not generate types: ${(err as Error).message}`);
          return false;
        }
      };

      const ok = run();
      if (!opts.watch) {
        if (!ok) process.exitCode = 1;
        return;
      }

      console.log(`👀 Watching ${resolve(file)} — Ctrl+C to stop`);
      // Polling (same as `serve --watch`) survives editors that save via rename.
      watchFile(resolve(file), { interval: 300 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) run();
      });
    });
}
