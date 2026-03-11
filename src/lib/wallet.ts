import { Chain, SignatureType } from "@polymarket/clob-client";
import { createWalletClient, encodeAbiParameters, getAddress, getCreate2Address, hexToBytes, http, keccak256, type Address, type Hex, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon, polygonAmoy } from "viem/chains";

import type { RuntimeConfig } from "../config/schema.js";
import { AppError } from "./errors.js";

export type SignatureMode = "eoa" | "proxy" | "gnosis-safe";

export type WalletContext = {
  privateKey: Hex;
  address: Address;
  chainId: Chain;
  signatureMode: SignatureMode;
  signatureType: SignatureType;
  funderAddress: Address;
  signer: WalletClient;
};

const PROXY_FACTORY: Partial<Record<Chain, Address>> = {
  [Chain.POLYGON]: "0xaB45c5A4B0c941a2F231C04C3f49182e1A254052",
};

const SAFE_FACTORY: Record<Chain, Address> = {
  [Chain.POLYGON]: "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b",
  [Chain.AMOY]: "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b",
};

const PROXY_INIT_CODE_HASH =
  "0xd21df8dc65880a8606f09fe0ce3df9b8869287ab0b058be05aa9e8af6330a00b" as const;

const SAFE_INIT_CODE_HASH =
  "0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf" as const;

function normalizePrivateKey(privateKey: string): Hex {
  return (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex;
}

export function resolveChain(chainId: Chain): typeof polygon | typeof polygonAmoy {
  return chainId === Chain.AMOY ? polygonAmoy : polygon;
}

export function deriveProxyWallet(eoaAddress: Address, chainId: Chain): Address | null {
  const factory = PROXY_FACTORY[chainId];

  if (!factory) {
    return null;
  }

  const salt = keccak256(hexToBytes(eoaAddress));

  return getCreate2Address({
    from: factory,
    salt,
    bytecodeHash: PROXY_INIT_CODE_HASH,
  });
}

export function deriveSafeWallet(eoaAddress: Address, chainId: Chain): Address {
  const salt = keccak256(
    encodeAbiParameters([{ type: "address" }], [eoaAddress]),
  );

  return getCreate2Address({
    from: SAFE_FACTORY[chainId],
    salt,
    bytecodeHash: SAFE_INIT_CODE_HASH,
  });
}

export function signatureTypeFromMode(mode: SignatureMode): SignatureType {
  switch (mode) {
    case "eoa":
      return SignatureType.EOA;
    case "proxy":
      return SignatureType.POLY_PROXY;
    case "gnosis-safe":
      return SignatureType.POLY_GNOSIS_SAFE;
  }
}

function defaultFunderAddress(address: Address, chainId: Chain, mode: SignatureMode): Address {
  if (mode === "eoa") {
    return address;
  }

  if (mode === "proxy") {
    const proxy = deriveProxyWallet(address, chainId);

    if (!proxy) {
      throw new AppError("Proxy funder address is unavailable on this chain", {
        statusCode: 400,
        code: "UNSUPPORTED_SIGNATURE_MODE",
      });
    }

    return proxy;
  }

  return deriveSafeWallet(address, chainId);
}

export function resolveWalletContext(headers: Record<string, unknown>, config: RuntimeConfig): WalletContext | null {
  const overridePrivateKeyHeader = headers["x-polymarket-private-key"];
  const overrideFunderHeader = headers["x-polymarket-funder-address"];
  const overrideSignatureHeader = headers["x-polymarket-signature-type"];

  const overridePrivateKey = typeof overridePrivateKeyHeader === "string" ? overridePrivateKeyHeader : undefined;
  const overrideFunderAddress = typeof overrideFunderHeader === "string" ? overrideFunderHeader : undefined;
  const overrideSignatureMode = typeof overrideSignatureHeader === "string" ? overrideSignatureHeader : undefined;

  if (overridePrivateKey && !config.POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE) {
    throw new AppError("Private key override is disabled on this server", {
      statusCode: 403,
      code: "PRIVATE_KEY_OVERRIDE_DISABLED",
    });
  }

  const privateKey = overridePrivateKey ?? config.POLYMARKET_PRIVATE_KEY;

  if (!privateKey) {
    return null;
  }

  const signatureModeValue = overrideSignatureMode ?? config.POLYMARKET_SIGNATURE_TYPE;

  if (
    signatureModeValue !== "eoa" &&
    signatureModeValue !== "proxy" &&
    signatureModeValue !== "gnosis-safe"
  ) {
    throw new AppError("Unsupported signature mode override", {
      statusCode: 400,
      code: "INVALID_SIGNATURE_MODE",
    });
  }

  const signatureMode = signatureModeValue;
  const chainId = config.POLYMARKET_CHAIN_ID as Chain;
  const account = privateKeyToAccount(normalizePrivateKey(privateKey));
  const signer = createWalletClient({
    account,
    chain: resolveChain(chainId),
    transport: http(config.POLYMARKET_RPC_URL),
  });
  const address = getAddress(account.address);
  const funderAddress = getAddress(
    overrideFunderAddress ?? config.POLYMARKET_FUNDER_ADDRESS ?? defaultFunderAddress(address, chainId, signatureMode),
  );

  return {
    privateKey: normalizePrivateKey(privateKey),
    address,
    chainId,
    signatureMode,
    signatureType: signatureTypeFromMode(signatureMode),
    funderAddress,
    signer,
  };
}
