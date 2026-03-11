import {
  AssetType,
  Chain,
  ClobClient,
  OrderType,
  PriceHistoryInterval,
  Side,
  type PostOrdersArgs,
  type ApiKeyCreds,
  type BalanceAllowanceParams,
  type OpenOrderParams,
  type OrderMarketCancelParams,
  type OrderScoringParams,
  type OrdersScoringParams,
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

type TagsListParams = {
  limit?: number;
  offset?: number;
  ascending?: boolean;
  order?: string;
};

type TeamsListParams = {
  limit?: number;
  offset?: number;
  ascending?: boolean;
  order?: string;
  league?: string;
};

type CommentsListParams = {
  entityType: "event" | "market" | "series";
  entityId: string;
  limit?: number;
  offset?: number;
  order?: string;
  ascending?: boolean;
};

type AuthHeaders = Record<string, unknown>;
const BRIDGE_HOST = "https://bridge.polymarket.com/";

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

  async tagsList(params: TagsListParams): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/tags", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: params,
    });
  }

  async tagGet(id: string): Promise<unknown> {
    const path = /^\d+$/.test(id) ? `/tags/${id}` : `/tags/slug/${id}`;

    return requestJson(this.config.POLYMARKET_GAMMA_HOST, path, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
    });
  }

  async tagRelated(id: string, omitEmpty?: boolean): Promise<unknown> {
    const path = /^\d+$/.test(id) ? `/tags/${id}/related-tags` : `/tags/slug/${id}/related-tags`;

    return requestJson(this.config.POLYMARKET_GAMMA_HOST, path, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: { omit_empty: omitEmpty },
    });
  }

  async tagRelatedTags(id: string, omitEmpty?: boolean): Promise<unknown> {
    const path = /^\d+$/.test(id) ? `/tags/${id}/related-tags/tags` : `/tags/slug/${id}/related-tags/tags`;

    return requestJson(this.config.POLYMARKET_GAMMA_HOST, path, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: { omit_empty: omitEmpty },
    });
  }

  async seriesList(params: MarketListParams): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/series", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: params,
    });
  }

  async seriesGet(id: string): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, `/series/${id}`, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
    });
  }

  async commentsList(params: CommentsListParams): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/comments", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: {
        parent_entity_type: params.entityType,
        parent_entity_id: params.entityId,
        limit: params.limit,
        offset: params.offset,
        order: params.order,
        ascending: params.ascending,
      },
    });
  }

  async commentsGet(id: string): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, `/comments/${id}`, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
    });
  }

  async commentsByUser(address: string, params: DataWindowParams & { order?: string; ascending?: boolean }): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, `/comments/user_address/${address}`, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: params,
    });
  }

  async profileGet(address: string): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/public-profile", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: { address },
    });
  }

  async sportsList(): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/sports", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
    });
  }

  async sportsMarketTypes(): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/sports/market-types", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
    });
  }

  async teamsList(params: TeamsListParams): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_GAMMA_HOST, "/teams", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "gamma",
      query: {
        ...params,
        league: params.league ? [params.league] : undefined,
      },
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

  async dataClosedPositions(address: string, params: DataWindowParams): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/closed-positions", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: { user: address, ...params },
    });
  }

  async dataTraded(address: string): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/traded", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: { user: address },
    });
  }

  async dataActivity(address: string, params: DataWindowParams): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/activity", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: { user: address, ...params },
    });
  }

  async dataHolders(market: string, limit?: number): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/holders", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: { markets: [market], limit },
    });
  }

  async dataOpenInterest(market: string): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/oi", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: { markets: [market] },
    });
  }

  async dataVolume(id: number): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/live-volume", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: { id },
    });
  }

  async dataLeaderboard(params: DataWindowParams & { period?: string; orderBy?: string }): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/v1/leaderboard", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: {
        time_period: params.period,
        order_by: params.orderBy,
        limit: params.limit,
        offset: params.offset,
      },
    });
  }

  async dataBuilderLeaderboard(params: DataWindowParams & { period?: string }): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/v1/builders/leaderboard", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: {
        time_period: params.period,
        limit: params.limit,
        offset: params.offset,
      },
    });
  }

  async dataBuilderVolume(period?: string): Promise<unknown> {
    return requestJson(this.config.POLYMARKET_DATA_HOST, "/v1/builders/volume", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "data",
      query: { time_period: period },
    });
  }

  async bridgeDeposit(address: string): Promise<unknown> {
    return requestJson(BRIDGE_HOST, "/deposit", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "bridge",
      method: "POST",
      body: { address },
    });
  }

  async bridgeSupportedAssets(): Promise<unknown> {
    return requestJson(BRIDGE_HOST, "/supported-assets", {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "bridge",
    });
  }

  async bridgeStatus(address: string): Promise<unknown> {
    return requestJson(BRIDGE_HOST, `/status/${address}`, {
      timeoutMs: this.config.REQUEST_TIMEOUT_MS,
      upstreamService: "bridge",
    });
  }

  async clobOk(): Promise<unknown> {
    return this.publicClob().getOk();
  }

  async clobPrice(tokenId: string, side: "BUY" | "SELL"): Promise<unknown> {
    return this.publicClob().getPrice(tokenId, side);
  }

  async clobPrices(tokenIds: string[], side: "BUY" | "SELL"): Promise<unknown> {
    return this.publicClob().getPrices(tokenIds.map((token_id) => ({ token_id, side: side as Side })));
  }

  async clobMidpoint(tokenId: string): Promise<unknown> {
    return this.publicClob().getMidpoint(tokenId);
  }

  async clobMidpoints(tokenIds: string[]): Promise<unknown> {
    return this.publicClob().getMidpoints(tokenIds.map((token_id) => ({ token_id, side: "BUY" as any })));
  }

  async clobSpread(tokenId: string): Promise<unknown> {
    return this.publicClob().getSpread(tokenId);
  }

  async clobSpreads(tokenIds: string[]): Promise<unknown> {
    return this.publicClob().getSpreads(tokenIds.map((token_id) => ({ token_id, side: "BUY" as any })));
  }

  async clobBook(tokenId: string): Promise<unknown> {
    return this.publicClob().getOrderBook(tokenId);
  }

  async clobBooks(tokenIds: string[]): Promise<unknown> {
    return this.publicClob().getOrderBooks(tokenIds.map((token_id) => ({ token_id, side: "BUY" as any })));
  }

  async clobLastTrade(tokenId: string): Promise<unknown> {
    return this.publicClob().getLastTradePrice(tokenId);
  }

  async clobLastTrades(tokenIds: string[]): Promise<unknown> {
    return this.publicClob().getLastTradesPrices(tokenIds.map((token_id) => ({ token_id, side: "BUY" as any })));
  }

  async clobMarket(conditionId: string): Promise<unknown> {
    return this.publicClob().getMarket(conditionId);
  }

  async clobMarketTrades(conditionId: string): Promise<unknown> {
    return this.publicClob().getMarketTradesEvents(conditionId);
  }

  async clobMarkets(cursor?: string): Promise<unknown> {
    return this.publicClob().getMarkets(cursor);
  }

  async clobSamplingMarkets(cursor?: string): Promise<unknown> {
    return this.publicClob().getSamplingMarkets(cursor);
  }

  async clobSimplifiedMarkets(cursor?: string): Promise<unknown> {
    return this.publicClob().getSimplifiedMarkets(cursor);
  }

  async clobSamplingSimplifiedMarkets(cursor?: string): Promise<unknown> {
    return this.publicClob().getSamplingSimplifiedMarkets(cursor);
  }

  async clobTickSize(tokenId: string): Promise<unknown> {
    return this.publicClob().getTickSize(tokenId);
  }

  async clobFeeRate(tokenId: string): Promise<unknown> {
    return this.publicClob().getFeeRateBps(tokenId);
  }

  async clobNegRisk(tokenId: string): Promise<unknown> {
    return this.publicClob().getNegRisk(tokenId);
  }

  async clobPriceHistory(tokenId: string, interval?: "1h" | "6h" | "1d" | "1w" | "max", fidelity?: number): Promise<unknown> {
    const payload: {
      market: string;
      fidelity?: number;
      interval?: PriceHistoryInterval;
    } = {
      market: tokenId,
    };

    if (fidelity !== undefined) {
      payload.fidelity = fidelity;
    }

    if (interval !== undefined) {
      payload.interval = interval as PriceHistoryInterval;
    }

    return this.publicClob().getPricesHistory(payload);
  }

  async clobServerTime(): Promise<unknown> {
    return this.publicClob().getServerTime();
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

  async clobUpdateBalance(headers: AuthHeaders, params: { assetType: "collateral" | "conditional"; tokenId?: string }): Promise<unknown> {
    const client = await this.authClob(headers);
    const payload: BalanceAllowanceParams = {
      asset_type: params.assetType === "collateral" ? AssetType.COLLATERAL : AssetType.CONDITIONAL,
    };

    if (params.tokenId) {
      payload.token_id = params.tokenId;
    }

    await client.updateBalanceAllowance(payload);
    return {
      updated: true,
      ...payload,
    };
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

  async clobPostOrders(
    headers: AuthHeaders,
    payload: {
      orders: Array<UserOrder & { orderType?: "GTC" | "GTD" | "FOK" | "FAK"; postOnly?: boolean }>;
      defaultOrderType?: "GTC" | "GTD" | "FOK" | "FAK";
      deferExec?: boolean;
      defaultPostOnly?: boolean;
    },
  ): Promise<unknown> {
    const client = await this.authClob(headers);
    const { orders, defaultOrderType = "GTC", deferExec = false, defaultPostOnly = false } = payload;
    const args: PostOrdersArgs[] = [];

    for (const { orderType, postOnly, ...order } of orders) {
      const signedOrder = await client.createOrder(order);
      const entry: PostOrdersArgs = {
        order: signedOrder,
        orderType: OrderType[orderType ?? defaultOrderType],
      };

      if (postOnly !== undefined) {
        entry.postOnly = postOnly;
      }

      args.push(entry);
    }

    return client.postOrders(args, deferExec, defaultPostOnly);
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

  async clobCancelOrders(headers: AuthHeaders, orderIds: string[]): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.cancelOrders(orderIds);
  }

  async clobCancelAll(headers: AuthHeaders): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.cancelAll();
  }

  async clobCancelMarket(headers: AuthHeaders, payload: OrderMarketCancelParams): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.cancelMarketOrders(payload);
  }

  async clobNotifications(headers: AuthHeaders): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getNotifications();
  }

  async clobDeleteNotifications(headers: AuthHeaders, ids?: string[]): Promise<unknown> {
    const client = await this.authClob(headers);
    await client.dropNotifications(ids && ids.length > 0 ? { ids } : undefined);

    return {
      deleted: true,
      ids: ids ?? [],
      deleteAll: !ids || ids.length === 0,
    };
  }

  async clobRewards(headers: AuthHeaders, date: string): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getEarningsForUserForDay(date);
  }

  async clobEarnings(headers: AuthHeaders, date: string): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getTotalEarningsForUserForDay(date);
  }

  async clobEarningsMarkets(
    headers: AuthHeaders,
    params: { date: string; orderBy?: string; position?: string; noCompetition?: boolean },
  ): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getUserEarningsAndMarketsConfig(
      params.date,
      params.orderBy,
      params.position,
      params.noCompetition,
    );
  }

  async clobRewardPercentages(headers: AuthHeaders): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getRewardPercentages();
  }

  async clobCurrentRewards(): Promise<unknown> {
    return this.publicClob().getCurrentRewards();
  }

  async clobMarketReward(conditionId: string): Promise<unknown> {
    return this.publicClob().getRawRewardsForMarket(conditionId);
  }

  async clobOrderScoring(headers: AuthHeaders, params: OrderScoringParams): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.isOrderScoring(params);
  }

  async clobOrdersScoring(headers: AuthHeaders, params: OrdersScoringParams): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.areOrdersScoring(params);
  }

  async clobApiKeys(headers: AuthHeaders): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getApiKeys();
  }

  async clobDeleteApiKey(headers: AuthHeaders): Promise<unknown> {
    const client = await this.authClob(headers);
    const response = await client.deleteApiKey();

    return {
      deleted: true,
      response,
    };
  }

  async clobAccountStatus(headers: AuthHeaders): Promise<unknown> {
    const client = await this.authClob(headers);
    return client.getClosedOnlyMode();
  }
}
