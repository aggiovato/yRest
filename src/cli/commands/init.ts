import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";

const DB_TEMPLATE = `users:
  - id: 1
    name: Ana
    email: ana@test.com

  - id: 2
    name: Luis
    email: luis@test.com

posts:
  - id: 1
    title: First post
    userId: 1
`;

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create a sample db.yml in the current directory")
    .option("-f, --file <name>", "Output filename", "db.yml")
    .action((flags: { file: string }) => {
      const target = resolve(process.cwd(), flags.file);
      if (existsSync(target)) {
        console.error(`Error: ${flags.file} already exists.`);
        process.exit(1);
      }
      writeFileSync(target, DB_TEMPLATE, "utf8");
      console.log(`Created ${flags.file}`);
      console.log(`Run: yrest serve ${flags.file}`);
    });
}
