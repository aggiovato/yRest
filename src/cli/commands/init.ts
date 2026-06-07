import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import { SAMPLES, templates } from "./templates/index.js";
import type { Sample } from "./templates/index.js";

/**
 * Registers the `init` command.
 * Creates a sample db.yml file in the current working directory.
 * Exits with an error if the file already exists or an unknown sample is requested.
 */
export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create a sample db.yml in the current directory")
    .option("-f, --file <name>", "Output filename", "db.yml")
    .option("-s, --sample <name>", `Sample data to use (${SAMPLES.join(", ")})`, "basic")
    .action((flags: { file: string; sample: string }) => {
      if (!SAMPLES.includes(flags.sample as Sample)) {
        console.error(`Error: unknown sample "${flags.sample}". Available: ${SAMPLES.join(", ")}`);
        process.exit(1);
      }

      const target = resolve(process.cwd(), flags.file);
      if (existsSync(target)) {
        console.error(`Error: ${flags.file} already exists.`);
        process.exit(1);
      }

      writeFileSync(target, templates[flags.sample as Sample], "utf8");
      console.log(`Created ${flags.file} (sample: ${flags.sample})`);
      console.log(`Run: npx @aggiovato/yrest serve ${flags.file}`);
    });
}
