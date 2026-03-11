import { describe, expect, it } from "vitest";

import { buildCommandRegistry, listCommands } from "../src/commands.js";
import type { RuntimeConfig } from "../src/config/schema.js";
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
};

describe("command registry", () => {
  it("includes expanded market, data and CLOB capabilities", () => {
    const registry = buildCommandRegistry(new PolymarketService(config));
    const commands = new Set(listCommands(registry).map((entry) => entry.command));

    expect(commands.has("tags.list")).toBe(true);
    expect(commands.has("sports.teams")).toBe(true);
    expect(commands.has("bridge.supportedAssets")).toBe(true);
    expect(commands.has("approve.check")).toBe(true);
    expect(commands.has("approve.set")).toBe(true);
    expect(commands.has("ctf.conditionId")).toBe(true);
    expect(commands.has("ctf.redeemNegRisk")).toBe(true);
    expect(commands.has("clob.prices")).toBe(true);
    expect(commands.has("clob.marketTrades")).toBe(true);
    expect(commands.has("clob.postOrders")).toBe(true);
    expect(commands.has("clob.notifications")).toBe(true);
    expect(commands.has("clob.currentRewards")).toBe(true);
    expect(commands.has("clob.accountStatus")).toBe(true);
    expect(commands.size).toBeGreaterThanOrEqual(65);
  });
});
