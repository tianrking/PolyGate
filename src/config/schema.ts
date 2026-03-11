import { isAddress } from "viem";
import { z } from "zod";

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

const csvList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const addressSchema = z.string().refine((value) => isAddress(value), {
  message: "must be a valid EVM address",
});

export const runtimeConfigSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3107),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  APP_CORS_ORIGIN: z.string().default("*"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(8000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10000).default(120),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  POLYMARKET_CHAIN_ID: z
    .coerce
    .number()
    .int()
    .refine((value) => value === 137 || value === 80002, {
      message: "POLYMARKET_CHAIN_ID must be 137 or 80002",
    })
    .default(137),
  POLYMARKET_GAMMA_HOST: z.string().url().default("https://gamma-api.polymarket.com/"),
  POLYMARKET_DATA_HOST: z.string().url().default("https://data-api.polymarket.com/"),
  POLYMARKET_CLOB_HOST: z.string().url().default("https://clob.polymarket.com"),
  POLYMARKET_RPC_URL: z.string().url().default("https://polygon.drpc.org"),
  POLYMARKET_PRIVATE_KEY: z.string().optional(),
  POLYMARKET_FUNDER_ADDRESS: addressSchema.optional(),
  POLYMARKET_SIGNATURE_TYPE: z.enum(["eoa", "proxy", "gnosis-safe"]).default("proxy"),
  POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE: booleanish.default(false),
  POLYMARKET_API_KEY_CACHE_TTL_MS: z.coerce.number().int().min(1000).max(3600000).default(300000),
  POLYGATE_DISABLED_COMMANDS: csvList,
  POLYGATE_FORCE_AUTH_COMMANDS: csvList,
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export function parseRuntimeConfig(source: Record<string, unknown>): RuntimeConfig {
  const parsed = runtimeConfigSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid runtime configuration:\n${issues.join("\n")}`);
  }

  return parsed.data;
}
