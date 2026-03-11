import { getContractConfig } from "@polymarket/clob-client";
import { type Address, type Hex } from "viem";

import { AppError } from "./errors.js";

const USDC_DECIMALS = 6n;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ERC1155_ABI = [
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const CONDITIONAL_TOKENS_ABI = [
  ...ERC1155_ABI,
  {
    type: "function",
    name: "getConditionId",
    stateMutability: "pure",
    inputs: [
      { name: "oracle", type: "address" },
      { name: "questionId", type: "bytes32" },
      { name: "outcomeSlotCount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "getCollectionId",
    stateMutability: "view",
    inputs: [
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId", type: "bytes32" },
      { name: "indexSet", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "getPositionId",
    stateMutability: "pure",
    inputs: [
      { name: "collateralToken", type: "address" },
      { name: "collectionId", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "splitPosition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "collateralToken", type: "address" },
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId", type: "bytes32" },
      { name: "partition", type: "uint256[]" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "mergePositions",
    stateMutability: "nonpayable",
    inputs: [
      { name: "collateralToken", type: "address" },
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId", type: "bytes32" },
      { name: "partition", type: "uint256[]" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "redeemPositions",
    stateMutability: "nonpayable",
    inputs: [
      { name: "collateralToken", type: "address" },
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId", type: "bytes32" },
      { name: "indexSets", type: "uint256[]" },
    ],
    outputs: [],
  },
] as const;

export const NEG_RISK_ADAPTER_ABI = [
  {
    type: "function",
    name: "redeemPositions",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_conditionId", type: "bytes32" },
      { name: "_amounts", type: "uint256[]" },
    ],
    outputs: [],
  },
] as const;

export function getPolymarketContracts(chainId: 137 | 80002): {
  exchange: Address;
  negRiskExchange: Address;
  negRiskAdapter: Address;
  collateral: Address;
  conditionalTokens: Address;
} {
  const config = getContractConfig(chainId);

  return {
    exchange: config.exchange as Address,
    negRiskExchange: config.negRiskExchange as Address,
    negRiskAdapter: config.negRiskAdapter as Address,
    collateral: config.collateral as Address,
    conditionalTokens: config.conditionalTokens as Address,
  };
}

export function parseUsdcAmount(value: string | number): bigint {
  const input = String(value).trim();

  if (!/^\d+(\.\d+)?$/.test(input)) {
    throw new AppError(`Invalid amount: ${input}`, {
      statusCode: 400,
      code: "INVALID_AMOUNT",
    });
  }

  const [whole, fraction = ""] = input.split(".");
  if (fraction.length > Number(USDC_DECIMALS)) {
    throw new AppError(`Amount ${input} exceeds USDC precision`, {
      statusCode: 400,
      code: "INVALID_AMOUNT_PRECISION",
    });
  }

  const fractionPadded = fraction.padEnd(Number(USDC_DECIMALS), "0");
  return BigInt(whole ?? "0") * 10n ** USDC_DECIMALS + BigInt(fractionPadded || "0");
}

export function parseUsdcAmounts(values: string[]): bigint[] {
  return values.map((value) => parseUsdcAmount(value));
}

export function defaultBinaryPartition(): bigint[] {
  return [1n, 2n];
}
