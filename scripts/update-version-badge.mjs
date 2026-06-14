#!/usr/bin/env node
// Runs as part of the `npm version` lifecycle (see "version" script in package.json).
// Updates version-pinned badge URLs in README.md to match the new package version.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const version = require("../package.json").version;
const file = "README.md";
const content = readFileSync(file, "utf8");

const updated = content.replace(
  /badge\.socket\.dev\/npm\/package\/@yrest\/cli\/[\d]+\.[\d]+\.[\d]+/g,
  `badge.socket.dev/npm/package/@yrest/cli/${version}`
);

writeFileSync(file, updated);
// eslint-disable-next-line no-undef
console.log(`[update-version-badge] Socket badge → v${version}`);
