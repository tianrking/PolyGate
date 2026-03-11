import { describe, expect, it } from "vitest";

import { buildCommandRegistry } from "../src/commands.js";
import type { RuntimeConfig } from "../src/config/schema.js";
import { getCommandDetails, listCommandDetails } from "../src/lib/command-catalog.js";
import { PolymarketService } from "../src/services/polymarket-service.js";

const config: RuntimeConfig = {
  HOST: "127.0.0.1",
  PORT: 3107,
  LOG_LEVEL: "silent",
  APP_CORS_ORIGIN: "*",
  REQUEST_TIMEOUT_MS: 8000,
  RATE_LIMIT_MAX: 120,
  RATE_LIMIT_WINDOW: "1 minute",
  POLYMARKET_CHAIN_ID: 137,
  POLYMARKET_GAMMA_HOST: "https://gamma-api.polymarket.com/",
  POLYMARKET_DATA_HOST: "https://data-api.polymarket.com/",
  POLYMARKET_CLOB_HOST: "https://clob.polymarket.com",
  POLYMARKET_RPC_URL: "https://polygon.drpc.org",
  POLYMARKET_PRIVATE_KEY: undefined,
  POLYMARKET_FUNDER_ADDRESS: undefined,
  POLYMARKET_SIGNATURE_TYPE: "proxy",
  POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE: false,
  POLYMARKET_API_KEY_CACHE_TTL_MS: 300000,
  POLYGATE_DISABLED_COMMANDS: [],
  POLYGATE_FORCE_AUTH_COMMANDS: [],
  POLYGATE_WEBHOOK_TIMEOUT_MS: 5000,
  POLYGATE_SSE_HEARTBEAT_MS: 15000,
};

describe("command catalog", () => {
  it("builds detailed command metadata with params schema and curl example", () => {
    const registry = buildCommandRegistry(new PolymarketService(config));
    const details = listCommandDetails(registry, "https://polygate.bkgr.workers.dev");
    const marketsList = details.find((entry) => entry.command === "markets.list");

    expect(marketsList).toBeDefined();
    expect(marketsList?.paramsSchema.type).toBe("object");
    expect(marketsList?.enabled).toBe(true);
    expect(marketsList?.paramsExample).toMatchObject({ limit: 1, offset: 1 });
    expect(marketsList?.curlExample).toContain("https://polygate.bkgr.workers.dev/api/v1/commands/execute");
    expect(marketsList?.curlExample).toContain("\"markets.list\"");
  });

  it("returns command detail for a single command and undefined for unknown command", () => {
    const registry = buildCommandRegistry(new PolymarketService(config));
    const statusDetails = getCommandDetails(registry, "status", "http://127.0.0.1:3107");
    const missingDetails = getCommandDetails(registry, "does.not.exist", "http://127.0.0.1:3107");

    expect(statusDetails?.command).toBe("status");
    expect(statusDetails?.enabled).toBe(true);
    expect(statusDetails?.paramsExample).toEqual({});
    expect(missingDetails).toBeUndefined();
  });

  it("applies auth and enabled overrides in command metadata", () => {
    const registry = buildCommandRegistry(new PolymarketService(config));
    const details = getCommandDetails(
      registry,
      "markets.list",
      "http://127.0.0.1:3107",
      {
        resolveAuthRequired: () => true,
        resolveEnabled: () => false,
      },
    );

    expect(details?.authRequired).toBe(true);
    expect(details?.enabled).toBe(false);
  });
});
