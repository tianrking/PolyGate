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

describe("command policy", () => {
  it("blocks disabled commands before execution", async () => {
    const config: RuntimeConfig = {
      ...baseConfig,
      POLYGATE_DISABLED_COMMANDS: ["wallet.info"],
    };
    const policy = buildCommandPolicy(config);
    const registry = buildCommandRegistry(new PolymarketService(config));

    await expect(
      executeCommandPayload(
        registry,
        { command: "wallet.info", params: {} },
        {},
        {
          config,
          isCommandDisabled: (command) => isCommandDisabled(policy, command),
          isAuthRequired: (command, defaultAuthRequired) =>
            isCommandAuthRequired(policy, command, defaultAuthRequired),
        },
      ),
    ).rejects.toMatchObject({
      code: "COMMAND_DISABLED",
      statusCode: 403,
    });
  });

  it("forces auth for configured commands", async () => {
    const config: RuntimeConfig = {
      ...baseConfig,
      POLYGATE_FORCE_AUTH_COMMANDS: ["wallet.info"],
    };
    const policy = buildCommandPolicy(config);
    const registry = buildCommandRegistry(new PolymarketService(config));

    await expect(
      executeCommandPayload(
        registry,
        { command: "wallet.info", params: {} },
        {},
        {
          config,
          isCommandDisabled: (command) => isCommandDisabled(policy, command),
          isAuthRequired: (command, defaultAuthRequired) =>
            isCommandAuthRequired(policy, command, defaultAuthRequired),
        },
      ),
    ).rejects.toMatchObject({
      code: "WALLET_REQUIRED",
      statusCode: 401,
    });
  });

  it("allows forced-auth commands when wallet credentials are configured", async () => {
    const config: RuntimeConfig = {
      ...baseConfig,
      POLYMARKET_PRIVATE_KEY:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      POLYGATE_FORCE_AUTH_COMMANDS: ["wallet.info"],
    };
    const policy = buildCommandPolicy(config);
    const registry = buildCommandRegistry(new PolymarketService(config));

    const result = await executeCommandPayload(
      registry,
      { command: "wallet.info", params: {} },
      {},
      {
        config,
        isCommandDisabled: (command) => isCommandDisabled(policy, command),
        isAuthRequired: (command, defaultAuthRequired) =>
          isCommandAuthRequired(policy, command, defaultAuthRequired),
      },
    );

    expect(result.command).toBe("wallet.info");
    expect(result.data).toMatchObject({
      configured: true,
    });
  });
});
