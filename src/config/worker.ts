import { parseRuntimeConfig, type RuntimeConfig } from "./schema.js";

export type WorkerBindings = {
  HOST?: string;
  PORT?: string;
  LOG_LEVEL?: string;
  APP_CORS_ORIGIN?: string;
  REQUEST_TIMEOUT_MS?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW?: string;
  POLYMARKET_CHAIN_ID?: string;
  POLYMARKET_GAMMA_HOST?: string;
  POLYMARKET_DATA_HOST?: string;
  POLYMARKET_CLOB_HOST?: string;
  POLYMARKET_RPC_URL?: string;
  POLYMARKET_PRIVATE_KEY?: string;
  POLYMARKET_FUNDER_ADDRESS?: string;
  POLYMARKET_SIGNATURE_TYPE?: string;
  POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE?: string;
  POLYMARKET_API_KEY_CACHE_TTL_MS?: string;
};

export function workerConfig(env: WorkerBindings): RuntimeConfig {
  return parseRuntimeConfig(env as Record<string, unknown>);
}
