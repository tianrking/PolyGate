import { describe, expect, it } from "vitest";

import { buildCommandRegistry } from "../src/commands.js";
import { parseRuntimeConfig, type RuntimeConfig } from "../src/config/schema.js";
import {
  buildCommandPolicy,
  isCommandAuthRequired,
  isCommandDisabled,
} from "../src/lib/command-policy.js";
import { PolymarketService } from "../src/services/polymarket-service.js";
import { executeCommandPayload } from "../src/transport/command-execution.js";

const runIntegration = process.env.POLYGATE_RUN_CHAIN_INTEGRATION_TESTS === "true";
const describeChain = runIntegration ? describe : describe.skip;
const TEST_TIMEOUT_MS = 6 * 60 * 1000;
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

function mustReadEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var for chain integration tests: ${name}`);
  }
  return value;
}

function readSplitConditionId(): string {
  return mustReadEnv("POLYGATE_CHAIN_TEST_SPLIT_CONDITION_ID");
}

function readRedeemConditionId(): string {
  return mustReadEnv("POLYGATE_CHAIN_TEST_REDEEM_CONDITION_ID");
}

function buildIntegrationConfig(apiToken: string): RuntimeConfig {
  const source: Record<string, unknown> = {
    ...process.env,
    LOG_LEVEL: process.env.LOG_LEVEL ?? "silent",
    POLYGATE_REQUIRE_API_TOKEN_FOR_PRIVATE: "true",
    POLYGATE_API_TOKENS: apiToken,
    POLYGATE_API_TOKEN_HEADER: "x-polygate-token",
  };

  return parseRuntimeConfig(source);
}

async function executePrivateCommand(
  runtimeConfig: RuntimeConfig,
  payload: { command: string; params: Record<string, unknown> },
  apiToken: string,
) {
  const policy = buildCommandPolicy(runtimeConfig);
  const service = new PolymarketService(runtimeConfig);
  const registry = buildCommandRegistry(service);

  return executeCommandPayload(
    registry,
    payload,
    { "x-polygate-token": apiToken },
    {
      config: runtimeConfig,
      isCommandDisabled: (command) => isCommandDisabled(policy, command),
      isAuthRequired: (command, defaultAuthRequired) =>
        isCommandAuthRequired(policy, command, defaultAuthRequired),
    },
  );
}

describeChain("chain integration: write commands", () => {
  it("executes approve.set end-to-end on chain", { timeout: TEST_TIMEOUT_MS }, async () => {
    const apiToken = process.env.POLYGATE_CHAIN_TEST_API_TOKEN ?? "chain-test-token";
    const config = buildIntegrationConfig(apiToken);

    const result = await executePrivateCommand(config, {
      command: "approve.set",
      params: {},
    }, apiToken);

    expect(result.command).toBe("approve.set");
    const data = result.data as { transactions: Array<Record<string, unknown>> };
    expect(Array.isArray(data.transactions)).toBe(true);
    expect(data.transactions.length).toBeGreaterThanOrEqual(6);
  });

  it("executes ctf.split and ctf.merge end-to-end on chain", { timeout: TEST_TIMEOUT_MS }, async () => {
    const splitConditionId = readSplitConditionId();
    const apiToken = process.env.POLYGATE_CHAIN_TEST_API_TOKEN ?? "chain-test-token";
    const splitAmount = process.env.POLYGATE_CHAIN_TEST_SPLIT_AMOUNT ?? "0.1";
    const collateral = process.env.POLYGATE_CHAIN_TEST_COLLATERAL;
    const partition = process.env.POLYGATE_CHAIN_TEST_PARTITION ?? "1,2";
    const parentCollectionId = process.env.POLYGATE_CHAIN_TEST_PARENT_COLLECTION_ID ?? ZERO_BYTES32;
    const config = buildIntegrationConfig(apiToken);
    const params: Record<string, unknown> = {
      conditionId: splitConditionId,
      amount: splitAmount,
      partition,
      parentCollectionId,
    };

    if (collateral) {
      params.collateral = collateral;
    }

    const split = await executePrivateCommand(config, {
      command: "ctf.split",
      params,
    }, apiToken);
    expect(split.command).toBe("ctf.split");
    expect(split.data).toMatchObject({
      action: "split",
      conditionId: splitConditionId,
    });

    const merge = await executePrivateCommand(config, {
      command: "ctf.merge",
      params,
    }, apiToken);
    expect(merge.command).toBe("ctf.merge");
    expect(merge.data).toMatchObject({
      action: "merge",
      conditionId: splitConditionId,
    });
  });

  it("executes ctf.redeem end-to-end on chain", { timeout: TEST_TIMEOUT_MS }, async () => {
    const redeemConditionId = readRedeemConditionId();
    const apiToken = process.env.POLYGATE_CHAIN_TEST_API_TOKEN ?? "chain-test-token";
    const collateral = process.env.POLYGATE_CHAIN_TEST_COLLATERAL;
    const indexSets = process.env.POLYGATE_CHAIN_TEST_REDEEM_INDEX_SETS ?? "1,2";
    const parentCollectionId = process.env.POLYGATE_CHAIN_TEST_PARENT_COLLECTION_ID ?? ZERO_BYTES32;
    const config = buildIntegrationConfig(apiToken);
    const params: Record<string, unknown> = {
      conditionId: redeemConditionId,
      indexSets,
      parentCollectionId,
    };

    if (collateral) {
      params.collateral = collateral;
    }

    const result = await executePrivateCommand(config, {
      command: "ctf.redeem",
      params,
    }, apiToken);

    expect(result.command).toBe("ctf.redeem");
    expect(result.data).toMatchObject({
      action: "redeem",
      conditionId: redeemConditionId,
    });
  });
});
