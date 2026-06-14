#!/usr/bin/env node
import { program } from "commander";
import { createRequire } from "module";
import { registerInit } from "./commands/init.js";
import { registerServe } from "./commands/serve.js";
import { registerHandler } from "./commands/handler.js";
import { registerOpenApi } from "./commands/openapi.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

program
  .name("yrest")
  .description("Zero-config REST API mock server powered by a YAML file")
  .version(version);

registerInit(program);
registerServe(program);
registerHandler(program);
registerOpenApi(program);

program.parse();
