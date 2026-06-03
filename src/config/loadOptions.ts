import { z } from "zod";

export const serverOptionsSchema = z.object({
  file: z.string().min(1),
  port: z.coerce.number().int().positive().default(3070),
  host: z.string().default("localhost"),
  base: z
    .string()
    .default("")
    .transform((v) => (v && !v.startsWith("/") ? `/${v}` : v)),
});

export type ServerOptions = z.infer<typeof serverOptionsSchema>;
