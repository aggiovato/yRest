import { basicTemplate } from "./basic.js";
import { relationalTemplate } from "./relational.js";

/** All available sample names accepted by the `--sample` flag. */
export const SAMPLES = ["basic", "relational"] as const;

/** Union of valid sample names. */
export type Sample = (typeof SAMPLES)[number];

/** Map of sample name to its YAML template string. */
export const templates: Record<Sample, string> = {
  basic: basicTemplate,
  relational: relationalTemplate,
};
