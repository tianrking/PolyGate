import { describe, expect, it } from "vitest";
import { getAddress } from "viem";

import { deriveProxyWallet, deriveSafeWallet } from "../src/lib/wallet.js";

describe("wallet derivation", () => {
  it("matches Rust SDK proxy derivation on Polygon", () => {
    expect(
      deriveProxyWallet("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 137),
    ).toBe(getAddress("0x365f0cA36ae1F641E02Fe3b7743673DA42A13a70"));
  });

  it("matches Rust SDK safe derivation on Polygon", () => {
    expect(
      deriveSafeWallet("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 137),
    ).toBe(getAddress("0xd93b25Cb943D14d0d34FBAf01fc93a0F8b5f6e47"));
  });
});
