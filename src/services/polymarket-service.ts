import {
  AssetType,
  Chain,
  ClobClient,
  OrderType,
  type ApiKeyCreds,
  type BalanceAllowanceParams,
  type OpenOrderParams,
  type TradeParams,
  type UserMarketOrder,
  type UserOrder,
} from "@polymarket/clob-client";

import type { RuntimeConfig } from "../config/schema.js";
import { AppError } from "../lib/errors.js";
import { requestJson } from "../lib/http.js";
import { resolveWalletContext, type WalletContext } from "../lib/wallet.js";

type ApiKeyCacheEntry = {
  creds: ApiKeyCreds;
  expiresAt: number;
};

type MarketListParams = {
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  order?: string;
  ascending?: boolean;
};

type EventListParams = MarketListParams & {
  tag?: string;
};

type DataWindowParams = {
  limit?: number;
  offset?: number;
};

type AuthHeaders = Record<string, unknown>;

export class PolymarketService {
  private readonly apiKeyCache = new Map<string, ApiKeyCacheEntry>();

  constructor(private readonly config: RuntimeConfig) {}

  private publicClob(): ClobClient {
    return new ClobClient(
      this.config.POLYMARKET_CLOB_HOST,
      this.config.POLYMARKET_CHAIN_ID as Chain,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      true,
      undefined,
      true,
    );
  }

  private walletContext(headers: AuthHeaders): WalletContext {
    const wallet = resolveWalletContext(headers, this.config);

    if (!wallet) {
      throw new AppError("No wallet configured for authenticated command", {
        statusCode: 400,
        code: "WALLET_REQUIRED",
      });
    }

    return wallet;
  }

  private cacheKey(wallet: WalletContext): string {
    return [
      wallet.chainId,
      wallet.address,
      wallet.funderAddress,
      wallet.signatureMode,
    ].join(":");
  }

  private async apiCreds(wallet: WalletContext): Promise<ApiKeyCreds> {
    const key = this.cacheKey(wallet);
    const cached = this.apiKeyCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.creds;
    }

    const bootstrap = new ClobClient(
      this.config.POLYMARKET_CLOB_HOST,
      wallet.chainId,
      wallet.signer,
      undefined,
      wallet.signatureType,
      wallet.funderAddress,
      undefined,
      true,
      undefined,
      undefined,
      true,
      undefined,
      true,
    );
    const creds = await bootstrap.createOrDeriveApiKey();

    this.apiKeyCache.set(key, {
      creds,
      expiresAt: Date.now() + this.config.POLYMARKET_API_KEY_CACHE_TTL_MS,
    });

    return creds;
  }

  private async authClob(headers: AuthHeaders): Promise<ClobClient> {
    const wallet = this.walletContext(headers);
    const creds = await this.apiCreds(wallet);

    return new ClobClient(
      this.config.POLYMARKET_CLOB_HOST,
      wallet.chainId,
      wallet.signer,
      creds,
      wallet.signatureType,
      wallet.funderAddress,
      undefined,
      true,
      undefined,
      undefined,
      true,
      undefined,
      true,
    );
  }

  async aggregatedStatus(): Promise<Record<string, unknown>> {
    const [gamma, data, clob] = await Promise.allSettled([
      requestJson<string>(this.config.POLYMARKET_GAMMA_HOST, "/status", {
        timeoutMs: this.config.REQUEST_TIMEOUT_MS,
        upstreamService: "gamma",
      }),
      requestJson<unknown>(this.config.POLYMARKET_DATA_HOST, "/", {
        timeoutMs: this.config.REQUEST_TIMEOUT_MS,
        upstreamService: "data",
      }),
      this.publicClob().getOk(),
    ]);

    const wallet = resolveWalletContext({}, this.config);

    return {
      service: "PolyGate",
      chainId: this.config.POLYMARKET_CHAIN_ID,
      wallet: {
        configured: wallet !== null,
        address: wallet?.address ?? null,
        funderAddress: wallet?.funderAddress ?? null,
        signatureMode: wallet?.signatureMode ?? null,
      },
      upstream: {
        gamma: gamma.status === "fulfilled"
          ? { ok: true, value: gamma.value }
          : { ok: false, error: gamma.reason instanceof Error ? gamma.reason.message : String(gamma.reason) },
        data: data.status === "fulfilled"
          ? { ok: true, value: data.value }
          : { ok: false, error: data.reason instanceof Error ? data.reason.message : String(data.reason) },
        clob: clob.status === "fulfilled"
          ? { ok: true, value: clob.value }
          : { ok: false, error: clob.reason instanceof Error ? clob.reason.message : String(clob.reason) },
      },
    };
  }

  async marketsList(params: MarketListParams): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/markets", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: params,
    });
  }

  async marketGet(id: string): Promise<unknown> {
    const path = /^\d+$/.test(id) ? `/markets/${id}` : `/markets/slug/${id}`;

    return requestJson(this.config.POLYMARKET_GAMMA_HOST, path, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
    });
  }

  async marketTags(id: string): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, `/markets/${id}/tags`, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
    });
  }

  async marketSearch(query: string, limit = 10): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/public-search", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: {
        q: query,
        limit_per_type: limit,
      },
    });
  }

  async eventsList(params: EventListParams): Promise<unknown> {
    const { tag, ...rest } = params;

    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/events", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: {
        ...rest,
        tag_slug: tag,
      },
    });
  }

  async eventGet(id: string): Promise<unknown> {
    const path = /^\d+$/.test(id) ? `/events/${id}` : `/events/slug/${id}`;

    return requestJson(this.config.POLYMARKET_GAMMA_HOST, path, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
    });
  }

  async eventTags(id: string): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, `/events/${id}/tags`, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
    });
  }

  async dataPositions(address: string, params: DataWindowParams): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/positions", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: {
        user: address,
        ...params,
      },
    });
  }

  async dataValue(address: string): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/value", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: { user: address },
    });
  }

  async dataTrades(address: string, params: DataWindowParams): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/trades", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: {
        user: address,
        ...params,
      },
    });
  }

  async clobOk(): Promise<unknown> {
    return this.publicClob().getOk();
  }

  async clobPrice(tokenId: string, side: "BUY" | "SELL"): Promise<unknown> {
    return this.publicClob().getPrice(tokenId, side);
  }

  async clobMidpoint(tokenId: string): Promise<unknown> {
    return this.publicClob().getMidpoint(tokenId);
  }

  async clobBook(tokenId: string): Promise<unknown> {
    return this.publicClob().getOrderBook(tokenId);
  }

  async clobMarket(conditionId: string): Promise<unknown> {
    return this.publicClob().getMarket(conditionId);
  }

  async clobMarkets(cursor?: string): Promise<unknown> {
    return this.publicClob().getMarkets(cursor);
  }

  async walletInfo(headers: AuthHeaders): Promise<Record<string, unknown>> {
    const wallet = resolveWalletContext(headers, this.config);

    return {
      configured: wallet !== null,
      chainId: this.config.POLYMARKET_CHAIN_ID,
      allowPrivateKeyOverride: this.config.POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE,
      address: wallet?.address ?? null,
      funderAddress: wallet?.funderAddress ?? null,
      signatureMode: wallet?.signatureMode ?? null,
    };
  }

  async clobOrders(headers: AuthHeaders, params: OpenOrderParams): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getOpenOrders(params);
  }

  async clobOrder(headers: AuthHeaders, orderId: string): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getOrder(orderId);
  }

  async clobBalance(headers: AuthHeaders, params: { assetType: "collateral" | "conditional"; tokenId?: string }): Promise<unknown> {
    const client = await this.authClob(headers);
    const payload: BalanceAllowanceParams = {
      asset_type: params.assetType === "collateral" ? AssetType.COLLATERAL : AssetType.CONDITIONAL,
    };

    if (params.tokenId) {
      payload.token_id = params.tokenId;
    }

    return client.getBalanceAllowance(payload);
  }

  async clobTrades(headers: AuthHeaders, params: TradeParams): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getTrades(params, true);
  }

  async clobCreateApiKey(headers: AuthHeaders, nonce?: number): Promise<unknown> {
    const wallet = this.walletContext(headers);
    const bootstrap = new ClobClient(
      this.config.POLYMARKET_CLOB_HOST,
      wallet.chainId,
      wallet.signer,
      undefined,
      wallet.signatureType,
      wallet.funderAddress,
      undefined,
      true,
      undefined,
      undefined,
      true,
      undefined,
      true,
    );

    const creds = await bootstrap.createOrDeriveApiKey(nonce);
    this.apiKeyCache.set(this.cacheKey(wallet), {
      creds,
      expiresAt: Date.now() + this.config.POLYMARKET_API_KEY_CACHE_TTL_MS,
    });

    return {
      key: creds.key,
      passphrase: creds.passphrase,
      secretPreview: `${creds.secret.slice(0, 6)}...${creds.secret.slice(-4)}`,
    };
  }

  async clobCreateOrder(headers: AuthHeaders, payload: UserOrder & { orderType?: "GTC" | "GTD" | "FOK" | "FAK"; postOnly?: boolean }): Promise<unknown> {
    const client = await this.authClob(headers);
    const { orderType = "GTC", postOnly = false, ...order } = payload;

    const signedOrder = await client.createOrder(order);
    return client.postOrder(signedOrder, OrderType[orderType], false, postOnly);
  }

  async clobCreateMarketOrder(headers: AuthHeaders, payload: UserMarketOrder & { orderType?: "FOK" | "FAK" }): Promise<unknown> {
    const client = await this.authClob(headers);
    const orderType = payload.orderType ?? "FOK";

    return client.createAndPostMarketOrder(payload, undefined, OrderType[orderType], false);
  }

  async clobCancelOrder(headers: AuthHeaders, orderId: string): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.cancelOrder({ orderID: orderId });
  }

  async clobCancelAll(headers: AuthHeaders): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.cancelAll();
  }
}
