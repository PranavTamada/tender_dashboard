import { z } from "zod";

/**
 * Centralized, validated environment access. Importing `env` anywhere
 * guarantees required vars exist and are typed. Validation is lazy so the
 * client bundle never throws on server-only vars.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REFRESH_SECRET: z.string().min(8).default("dev-refresh-secret"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  COLLECTORS_USE_SEED_ONLY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  COLLECTOR_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  COLLECTOR_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  COLLECTOR_RATE_LIMIT_MS: z.coerce.number().int().min(0).default(1200),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

// Eagerly resolved for convenience in server modules.
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
