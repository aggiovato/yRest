import { z } from "zod";

export const serverOptionsSchema = z.object({
  file: z.string().min(1),
  port: z.coerce.number().int().positive().default(3070),
  host: z.string().default("localhost"),
  base: z
    .string()
    .default("")
    .transform((v) => (v && !v.startsWith("/") ? `/${v}` : v)),
  readonly: z.boolean().default(false),
  delay: z.coerce.number().int().min(0).default(0),
});

export type ServerOptions = z.infer<typeof serverOptionsSchema>;
