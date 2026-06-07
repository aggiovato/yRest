import { z } from "zod";

/**
 * Zod schema for all server runtime options.
 *
 * Validates and normalises options from three sources in ascending priority:
 * schema defaults → `yrest.config.yml` → explicit CLI flags.
 */
export const serverOptionsSchema = z.object({
  /** Path to the YAML database file. Must be a non-empty string. */
  file: z.string().min(1),
  /** TCP port the server listens on. Accepts string input and coerces to number. */
  port: z.coerce.number().int().positive().default(3070),
  /** Hostname or IP address to bind. */
  host: z.string().default("localhost"),
  /**
   * URL prefix prepended to every route (e.g. `/api`).
   * A leading slash is added automatically if omitted.
   */
  base: z
    .string()
    .default("")
    .transform((v) => (v && !v.startsWith("/") ? `/${v}` : v)),
  /** When `true`, all mutating requests (POST, PUT, PATCH, DELETE) are rejected with 405. */
  readonly: z.boolean().default(false),
  /** Milliseconds to delay every response, simulating network latency. `0` = disabled. */
  delay: z.coerce.number().int().min(0).default(0),
});

/**
 * Resolved server configuration after Zod validation and transformation.
 * Inferred from {@link serverOptionsSchema}.
 */
export type ServerOptions = z.infer<typeof serverOptionsSchema>;
