#!/usr/bin/env node
import { program } from "commander";
import { registerInit } from "./commands/init.js";
import { registerServe } from "./commands/serve.js";

program
  .name("yrest")
  .description("Zero-config REST API mock server powered by a YAML file")
  .version("0.1.0");

registerInit(program);
registerServe(program);

program.parse();
