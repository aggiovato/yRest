import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import { SAMPLES, templates } from "./templates/index.js";
import type { Sample } from "./templates/index.js";

/** Default content for a generated `yrest.config.yml`. */
const CONFIG_TEMPLATE = `# yrest configuration
# All options can be overridden with CLI flags

file: db.yml        # YAML database file
port: 3070          # Port to listen on
host: localhost     # Host to bind
# base: /api        # Base path prefix for all routes
# watch: false      # Reload db file on change
# readonly: false   # Block write operations (POST, PUT, PATCH, DELETE)
# delay: 0          # Simulated network latency in milliseconds
# pageable: false   # Wrap GET collections in { data, pagination }. Use true (limit 10) or a number
# snapshot: false   # Save initial db state and expose /_snapshot endpoints (GET / POST save / POST reset)
# handlers: ./yrest.handlers.js  # JS file exporting handler functions for custom routes
`;

/**
 * Registers the `init` command with the CLI program.
 *
 * Creates a `db.yml` sample database and a `yrest.config.yml` template in the
 * current working directory. Exits with an error if `db.yml` already exists.
 * If `yrest.config.yml` already exists it is left untouched.
 *
 * @param program - The root Commander program instance.
 */
export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create a sample db.yml and yrest.config.yml in the current directory")
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

      const configTarget = resolve(process.cwd(), "yrest.config.yml");
      if (!existsSync(configTarget)) {
        writeFileSync(configTarget, CONFIG_TEMPLATE, "utf8");
        console.log("Created yrest.config.yml");
      }

      console.log(`Run: npx @aggiovato/yrest serve`);
    });
}
