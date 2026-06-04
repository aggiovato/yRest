import { basicTemplate } from "./basic.js";
import { relationalTemplate } from "./relational.js";

export const SAMPLES = ["basic", "relational"] as const;

export type Sample = (typeof SAMPLES)[number];

export const templates: Record<Sample, string> = {
  basic: basicTemplate,
  relational: relationalTemplate,
};
