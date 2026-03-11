import { describe, expect, it } from "vitest";

import { defaultBinaryPartition, getPolymarketContracts, parseUsdcAmount } from "../src/lib/ctf.js";

describe("ctf utils", () => {
  it("parses USDC amounts with 6 decimals", () => {
    expect(parseUsdcAmount("10")).toBe(10_000_000n);
    expect(parseUsdcAmount("0.5")).toBe(500_000n);
    expect(parseUsdcAmount(1.25)).toBe(1_250_000n);
  });

  it("returns the standard binary partition", () => {
    expect(defaultBinaryPartition()).toEqual([1n, 2n]);
  });

  it("returns Polygon contract addresses", () => {
    expect(getPolymarketContracts(137)).toEqual({
      exchange: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
      negRiskExchange: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
      negRiskAdapter: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
      collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      conditionalTokens: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
    });
  });
});
