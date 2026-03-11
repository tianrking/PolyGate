import { describe, expect, it } from "vitest";

import { buildCommandRegistry } from "../src/commands.js";
import type { RuntimeConfig } from "../src/config/schema.js";
import {
  buildCommandPolicy,
  isCommandAuthRequired,
  isCommandDisabled,
} from "../src/lib/command-policy.js";
import { PolymarketService } from "../src/services/polymarket-service.js";
import { executeCommandPayload } from "../src/transport/command-execution.js";

const baseConfig: RuntimeConfig = {
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
  POLYMARKET_PRIVATE_KEY:
    "0x1111111111111111111111111111111111111111111111111111111111111111",
  POLYMARKET_FUNDER_ADDRESS: undefined,
  POLYMARKET_SIGNATURE_TYPE: "proxy",
  POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE: false,
  POLYMARKET_API_KEY_CACHE_TTL_MS: 300000,
  POLYGATE_DISABLED_COMMANDS: [],
  POLYGATE_FORCE_AUTH_COMMANDS: ["wallet.info"],
  POLYGATE_REQUIRE_API_TOKEN_FOR_PRIVATE: true,
  POLYGATE_API_TOKENS: ["test-token"],
  POLYGATE_API_TOKEN_HEADER: "x-polygate-token",
  POLYGATE_WEBHOOK_URL: undefined,
  POLYGATE_WEBHOOK_BEARER_TOKEN: undefined,
  POLYGATE_WEBHOOK_TIMEOUT_MS: 5000,
  POLYGATE_SSE_HEARTBEAT_MS: 15000,
};

async function executeWalletInfo(
  config: RuntimeConfig,
  headers: Record<string, unknown> = {},
) {
  const policy = buildCommandPolicy(config);
  const registry = buildCommandRegistry(new PolymarketService(config));

  return executeCommandPayload(
    registry,
    { command: "wallet.info", params: {} },
    headers,
    {
      config,
      isCommandDisabled: (command) => isCommandDisabled(policy, command),
      isAuthRequired: (command, defaultAuthRequired) =>
        isCommandAuthRequired(policy, command, defaultAuthRequired),
    },
  );
}

describe("private command API token auth", () => {
  it("requires token when private command auth is enabled", async () => {
    await expect(
      executeWalletInfo(baseConfig),
    ).rejects.toMatchObject({
      code: "API_TOKEN_REQUIRED",
      statusCode: 401,
    });
  });

  it("rejects invalid token", async () => {
    await expect(
      executeWalletInfo(baseConfig, { "x-polygate-token": "wrong-token" }),
    ).rejects.toMatchObject({
      code: "API_TOKEN_INVALID",
      statusCode: 403,
    });
  });

  it("accepts configured token header", async () => {
    const result = await executeWalletInfo(baseConfig, {
      "x-polygate-token": "test-token",
    });

    expect(result.command).toBe("wallet.info");
    expect(result.data).toMatchObject({ configured: true });
  });

  it("accepts bearer token in authorization header", async () => {
    const result = await executeWalletInfo(baseConfig, {
      authorization: "Bearer test-token",
    });

    expect(result.command).toBe("wallet.info");
    expect(result.data).toMatchObject({ configured: true });
  });

  it("fails closed when token auth is enabled but tokens are not configured", async () => {
    const config: RuntimeConfig = {
      ...baseConfig,
      POLYGATE_API_TOKENS: [],
    };

    await expect(
      executeWalletInfo(config, { "x-polygate-token": "test-token" }),
    ).rejects.toMatchObject({
      code: "API_TOKEN_NOT_CONFIGURED",
      statusCode: 500,
    });
  });

  it("allows private commands without token when feature is disabled", async () => {
    const config: RuntimeConfig = {
      ...baseConfig,
      POLYGATE_REQUIRE_API_TOKEN_FOR_PRIVATE: false,
      POLYGATE_API_TOKENS: [],
    };
    const result = await executeWalletInfo(config);

    expect(result.command).toBe("wallet.info");
    expect(result.data).toMatchObject({ configured: true });
  });
});
