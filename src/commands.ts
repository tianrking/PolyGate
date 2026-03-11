import { Side, type OpenOrderParams, type TradeParams, type UserMarketOrder, type UserOrder } from "@polymarket/clob-client";
import { isAddress } from "viem";
import { z } from "zod";

import { PolymarketService } from "./services/polymarket-service.js";

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).max(10000).optional(),
});

const addressSchema = z.string().refine((value) => isAddress(value), {
  message: "must be a valid address",
});

const sideSchema = z.enum(["BUY", "SELL"]);
const orderTypeSchema = z.enum(["GTC", "GTD", "FOK", "FAK"]);
const entityTypeSchema = z.enum(["event", "market", "series"]);
const csvSchema = z.string().min(1).transform((value) => value.split(",").map((part) => part.trim()).filter(Boolean));
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");
const noopSchema = z.object({}).strict();
const createOrderSchema = z.object({
  tokenID: z.string().min(1),
  price: z.coerce.number().positive().max(1),
  size: z.coerce.number().positive(),
  side: sideSchema,
  feeRateBps: z.coerce.number().int().nonnegative().optional(),
  nonce: z.coerce.number().int().nonnegative().optional(),
  expiration: z.coerce.number().int().nonnegative().optional(),
  taker: addressSchema.optional(),
  orderType: orderTypeSchema.optional(),
  postOnly: z.coerce.boolean().optional(),
}).strict();
const createMarketOrderSchema = z.object({
  tokenID: z.string().min(1),
  amount: z.coerce.number().positive(),
  side: sideSchema,
  price: z.coerce.number().positive().max(1).optional(),
  feeRateBps: z.coerce.number().int().nonnegative().optional(),
  nonce: z.coerce.number().int().nonnegative().optional(),
  taker: addressSchema.optional(),
  orderType: z.enum(["FOK", "FAK"]).optional(),
}).strict();
const postOrdersSchema = z.object({
  orders: z.array(createOrderSchema).min(1).max(50),
  defaultOrderType: orderTypeSchema.optional(),
  deferExec: z.coerce.boolean().optional(),
  defaultPostOnly: z.coerce.boolean().optional(),
}).strict();
const balanceSchema = z.object({
  assetType: z.enum(["collateral", "conditional"]),
  tokenId: z.string().optional(),
}).strict();
const cancelMarketSchema = z.object({
  market: z.string().optional(),
  asset_id: z.string().optional(),
}).strict().superRefine((value, ctx) => {
  if (!value.market && !value.asset_id) {
    ctx.addIssue({
      code: "custom",
      message: "market or asset_id is required",
      path: ["market"],
    });
  }
});

type CommandHandler = {
  description: string;
  authRequired: boolean;
  schema: z.ZodTypeAny;
  execute: (params: any, headers: Record<string, unknown>) => Promise<unknown>;
};

export function buildCommandRegistry(service: PolymarketService): Record<string, CommandHandler> {
  return {
    status: {
      description: "Aggregated health across Gamma, Data and CLOB",
      authRequired: false,
      schema: noopSchema,
      execute: () => service.aggregatedStatus(),
    },
    "markets.list": {
      description: "List Gamma markets",
      authRequired: false,
      schema: z.object({
        active: z.coerce.boolean().optional(),
        closed: z.coerce.boolean().optional(),
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).max(10000).optional(),
        order: z.string().optional(),
        ascending: z.coerce.boolean().optional(),
      }).strict(),
      execute: (params) => service.marketsList(params),
    },
    "markets.get": {
      description: "Get a Gamma market by numeric ID or slug",
      authRequired: false,
      schema: z.object({ id: z.string().min(1) }).strict(),
      execute: ({ id }) => service.marketGet(id),
    },
    "markets.search": {
      description: "Search Gamma markets/events/profiles",
      authRequired: false,
      schema: z.object({
        query: z.string().min(1),
        limit: z.coerce.number().int().min(1).max(100).optional(),
      }).strict(),
      execute: ({ query, limit }) => service.marketSearch(query, limit),
    },
    "markets.tags": {
      description: "Get tags for a market",
      authRequired: false,
      schema: z.object({ id: z.string().min(1) }).strict(),
      execute: ({ id }) => service.marketTags(id),
    },
    "events.list": {
      description: "List Gamma events",
      authRequired: false,
      schema: z.object({
        active: z.coerce.boolean().optional(),
        closed: z.coerce.boolean().optional(),
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).max(10000).optional(),
        order: z.string().optional(),
        ascending: z.coerce.boolean().optional(),
        tag: z.string().optional(),
      }).strict(),
      execute: (params) => service.eventsList(params),
    },
    "events.get": {
      description: "Get a Gamma event by numeric ID or slug",
      authRequired: false,
      schema: z.object({ id: z.string().min(1) }).strict(),
      execute: ({ id }) => service.eventGet(id),
    },
    "events.tags": {
      description: "Get tags for an event",
      authRequired: false,
      schema: z.object({ id: z.string().min(1) }).strict(),
      execute: ({ id }) => service.eventTags(id),
    },
    "tags.list": {
      description: "List Gamma tags",
      authRequired: false,
      schema: z.object({
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).max(10000).optional(),
        order: z.string().optional(),
        ascending: z.coerce.boolean().optional(),
      }).strict(),
      execute: (params) => service.tagsList(params),
    },
    "tags.get": {
      description: "Get a tag by numeric ID or slug",
      authRequired: false,
      schema: z.object({ id: z.string().min(1) }).strict(),
      execute: ({ id }) => service.tagGet(id),
    },
    "tags.related": {
      description: "Get related tag relationships",
      authRequired: false,
      schema: z.object({
        id: z.string().min(1),
        omitEmpty: z.coerce.boolean().optional(),
      }).strict(),
      execute: ({ id, omitEmpty }) => service.tagRelated(id, omitEmpty),
    },
    "tags.relatedTags": {
      description: "Get related tag objects",
      authRequired: false,
      schema: z.object({
        id: z.string().min(1),
        omitEmpty: z.coerce.boolean().optional(),
      }).strict(),
      execute: ({ id, omitEmpty }) => service.tagRelatedTags(id, omitEmpty),
    },
    "series.list": {
      description: "List Gamma series",
      authRequired: false,
      schema: z.object({
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).max(10000).optional(),
        order: z.string().optional(),
        ascending: z.coerce.boolean().optional(),
        closed: z.coerce.boolean().optional(),
      }).strict(),
      execute: (params) => service.seriesList(params),
    },
    "series.get": {
      description: "Get a series by ID",
      authRequired: false,
      schema: z.object({ id: z.string().min(1) }).strict(),
      execute: ({ id }) => service.seriesGet(id),
    },
    "comments.list": {
      description: "List comments by entity",
      authRequired: false,
      schema: z.object({
        entityType: entityTypeSchema,
        entityId: z.string().min(1),
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).max(10000).optional(),
        order: z.string().optional(),
        ascending: z.coerce.boolean().optional(),
      }).strict(),
      execute: (params) => service.commentsList(params),
    },
    "comments.get": {
      description: "Get a comment by ID",
      authRequired: false,
      schema: z.object({ id: z.string().min(1) }).strict(),
      execute: ({ id }) => service.commentsGet(id),
    },
    "comments.byUser": {
      description: "List comments by wallet address",
      authRequired: false,
      schema: z.object({
        address: addressSchema,
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).max(10000).optional(),
        order: z.string().optional(),
        ascending: z.coerce.boolean().optional(),
      }).strict(),
      execute: ({ address, ...params }) => service.commentsByUser(address, params),
    },
    "profiles.get": {
      description: "Get a public profile by wallet address",
      authRequired: false,
      schema: z.object({ address: addressSchema }).strict(),
      execute: ({ address }) => service.profileGet(address),
    },
    "sports.list": {
      description: "List supported sports",
      authRequired: false,
      schema: noopSchema,
      execute: () => service.sportsList(),
    },
    "sports.marketTypes": {
      description: "List sports market types",
      authRequired: false,
      schema: noopSchema,
      execute: () => service.sportsMarketTypes(),
    },
    "sports.teams": {
      description: "List sports teams",
      authRequired: false,
      schema: z.object({
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).max(10000).optional(),
        order: z.string().optional(),
        ascending: z.coerce.boolean().optional(),
        league: z.string().optional(),
      }).strict(),
      execute: (params) => service.teamsList(params),
    },
    "data.positions": {
      description: "Get open positions for an address",
      authRequired: false,
      schema: z.object({
        address: addressSchema,
        ...paginationSchema.shape,
      }).strict(),
      execute: ({ address, ...params }) => service.dataPositions(address, params),
    },
    "data.value": {
      description: "Get position value for an address",
      authRequired: false,
      schema: z.object({ address: addressSchema }).strict(),
      execute: ({ address }) => service.dataValue(address),
    },
    "data.trades": {
      description: "Get trade history for an address",
      authRequired: false,
      schema: z.object({
        address: addressSchema,
        ...paginationSchema.shape,
      }).strict(),
      execute: ({ address, ...params }) => service.dataTrades(address, params),
    },
    "data.closedPositions": {
      description: "Get closed positions for an address",
      authRequired: false,
      schema: z.object({
        address: addressSchema,
        ...paginationSchema.shape,
      }).strict(),
      execute: ({ address, ...params }) => service.dataClosedPositions(address, params),
    },
    "data.traded": {
      description: "Get number of markets traded by an address",
      authRequired: false,
      schema: z.object({ address: addressSchema }).strict(),
      execute: ({ address }) => service.dataTraded(address),
    },
    "data.activity": {
      description: "Get activity for an address",
      authRequired: false,
      schema: z.object({
        address: addressSchema,
        ...paginationSchema.shape,
      }).strict(),
      execute: ({ address, ...params }) => service.dataActivity(address, params),
    },
    "data.holders": {
      description: "Get top holders for a market condition ID",
      authRequired: false,
      schema: z.object({
        market: z.string().min(1),
        limit: z.coerce.number().int().min(1).max(20).optional(),
      }).strict(),
      execute: ({ market, limit }) => service.dataHolders(market, limit),
    },
    "data.openInterest": {
      description: "Get open interest for a market condition ID",
      authRequired: false,
      schema: z.object({ market: z.string().min(1) }).strict(),
      execute: ({ market }) => service.dataOpenInterest(market),
    },
    "data.volume": {
      description: "Get live volume for an event",
      authRequired: false,
      schema: z.object({ id: z.coerce.number().int().positive() }).strict(),
      execute: ({ id }) => service.dataVolume(id),
    },
    "data.leaderboard": {
      description: "Get trader leaderboard",
      authRequired: false,
      schema: z.object({
        period: z.enum(["day", "week", "month", "all"]).optional(),
        orderBy: z.enum(["pnl", "vol"]).optional(),
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).max(10000).optional(),
      }).strict(),
      execute: (params) => service.dataLeaderboard(params),
    },
    "data.builderLeaderboard": {
      description: "Get builder leaderboard",
      authRequired: false,
      schema: z.object({
        period: z.enum(["day", "week", "month", "all"]).optional(),
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).max(10000).optional(),
      }).strict(),
      execute: (params) => service.dataBuilderLeaderboard(params),
    },
    "data.builderVolume": {
      description: "Get builder volume time series",
      authRequired: false,
      schema: z.object({
        period: z.enum(["day", "week", "month", "all"]).optional(),
      }).strict(),
      execute: ({ period }) => service.dataBuilderVolume(period),
    },
    "bridge.deposit": {
      description: "Get bridge deposit addresses for a wallet",
      authRequired: false,
      schema: z.object({ address: addressSchema }).strict(),
      execute: ({ address }) => service.bridgeDeposit(address),
    },
    "bridge.supportedAssets": {
      description: "List supported bridge assets",
      authRequired: false,
      schema: noopSchema,
      execute: () => service.bridgeSupportedAssets(),
    },
    "bridge.status": {
      description: "Get bridge deposit status by address",
      authRequired: false,
      schema: z.object({ address: z.string().min(1) }).strict(),
      execute: ({ address }) => service.bridgeStatus(address),
    },
    "clob.ok": {
      description: "Check CLOB health",
      authRequired: false,
      schema: noopSchema,
      execute: () => service.clobOk(),
    },
    "clob.price": {
      description: "Get token price",
      authRequired: false,
      schema: z.object({
        tokenId: z.string().min(1),
        side: sideSchema,
      }).strict(),
      execute: ({ tokenId, side }) => service.clobPrice(tokenId, side),
    },
    "clob.prices": {
      description: "Get token prices in batch",
      authRequired: false,
      schema: z.object({
        tokenIds: csvSchema,
        side: sideSchema,
      }).strict(),
      execute: ({ tokenIds, side }) => service.clobPrices(tokenIds, side),
    },
    "clob.midpoint": {
      description: "Get token midpoint",
      authRequired: false,
      schema: z.object({ tokenId: z.string().min(1) }).strict(),
      execute: ({ tokenId }) => service.clobMidpoint(tokenId),
    },
    "clob.midpoints": {
      description: "Get token midpoints in batch",
      authRequired: false,
      schema: z.object({ tokenIds: csvSchema }).strict(),
      execute: ({ tokenIds }) => service.clobMidpoints(tokenIds),
    },
    "clob.spread": {
      description: "Get token spread",
      authRequired: false,
      schema: z.object({ tokenId: z.string().min(1) }).strict(),
      execute: ({ tokenId }) => service.clobSpread(tokenId),
    },
    "clob.spreads": {
      description: "Get token spreads in batch",
      authRequired: false,
      schema: z.object({ tokenIds: csvSchema }).strict(),
      execute: ({ tokenIds }) => service.clobSpreads(tokenIds),
    },
    "clob.book": {
      description: "Get order book summary",
      authRequired: false,
      schema: z.object({ tokenId: z.string().min(1) }).strict(),
      execute: ({ tokenId }) => service.clobBook(tokenId),
    },
    "clob.books": {
      description: "Get order books in batch",
      authRequired: false,
      schema: z.object({ tokenIds: csvSchema }).strict(),
      execute: ({ tokenIds }) => service.clobBooks(tokenIds),
    },
    "clob.lastTrade": {
      description: "Get last trade price",
      authRequired: false,
      schema: z.object({ tokenId: z.string().min(1) }).strict(),
      execute: ({ tokenId }) => service.clobLastTrade(tokenId),
    },
    "clob.lastTrades": {
      description: "Get last trade prices in batch",
      authRequired: false,
      schema: z.object({ tokenIds: csvSchema }).strict(),
      execute: ({ tokenIds }) => service.clobLastTrades(tokenIds),
    },
    "clob.market": {
      description: "Get CLOB market by condition ID",
      authRequired: false,
      schema: z.object({ conditionId: z.string().min(1) }).strict(),
      execute: ({ conditionId }) => service.clobMarket(conditionId),
    },
    "clob.marketTrades": {
      description: "Get recent market trade events by condition ID",
      authRequired: false,
      schema: z.object({ conditionId: z.string().min(1) }).strict(),
      execute: ({ conditionId }) => service.clobMarketTrades(conditionId),
    },
    "clob.markets": {
      description: "List CLOB markets",
      authRequired: false,
      schema: z.object({ cursor: z.string().optional() }).strict(),
      execute: ({ cursor }) => service.clobMarkets(cursor),
    },
    "clob.samplingMarkets": {
      description: "List CLOB sampling markets",
      authRequired: false,
      schema: z.object({ cursor: z.string().optional() }).strict(),
      execute: ({ cursor }) => service.clobSamplingMarkets(cursor),
    },
    "clob.simplifiedMarkets": {
      description: "List simplified CLOB markets",
      authRequired: false,
      schema: z.object({ cursor: z.string().optional() }).strict(),
      execute: ({ cursor }) => service.clobSimplifiedMarkets(cursor),
    },
    "clob.samplingSimplifiedMarkets": {
      description: "List simplified sampling CLOB markets",
      authRequired: false,
      schema: z.object({ cursor: z.string().optional() }).strict(),
      execute: ({ cursor }) => service.clobSamplingSimplifiedMarkets(cursor),
    },
    "clob.tickSize": {
      description: "Get token tick size",
      authRequired: false,
      schema: z.object({ tokenId: z.string().min(1) }).strict(),
      execute: ({ tokenId }) => service.clobTickSize(tokenId),
    },
    "clob.feeRate": {
      description: "Get token fee rate in bps",
      authRequired: false,
      schema: z.object({ tokenId: z.string().min(1) }).strict(),
      execute: ({ tokenId }) => service.clobFeeRate(tokenId),
    },
    "clob.negRisk": {
      description: "Get neg-risk flag for token",
      authRequired: false,
      schema: z.object({ tokenId: z.string().min(1) }).strict(),
      execute: ({ tokenId }) => service.clobNegRisk(tokenId),
    },
    "clob.priceHistory": {
      description: "Get token price history",
      authRequired: false,
      schema: z.object({
        tokenId: z.string().min(1),
        interval: z.enum(["1h", "6h", "1d", "1w", "max"]).optional(),
        fidelity: z.coerce.number().int().positive().optional(),
      }).strict(),
      execute: ({ tokenId, interval, fidelity }) => service.clobPriceHistory(tokenId, interval, fidelity),
    },
    "clob.time": {
      description: "Get CLOB server time",
      authRequired: false,
      schema: noopSchema,
      execute: () => service.clobServerTime(),
    },
    "wallet.info": {
      description: "Show active wallet context",
      authRequired: false,
      schema: noopSchema,
      execute: (_params, headers) => service.walletInfo(headers),
    },
    "clob.orders": {
      description: "List authenticated open orders",
      authRequired: true,
      schema: z.object({
        market: z.string().optional(),
        asset_id: z.string().optional(),
        id: z.string().optional(),
      }).strict(),
      execute: (params, headers) => service.clobOrders(headers, params as OpenOrderParams),
    },
    "clob.order": {
      description: "Get a single authenticated order",
      authRequired: true,
      schema: z.object({ orderId: z.string().min(1) }).strict(),
      execute: ({ orderId }, headers) => service.clobOrder(headers, orderId),
    },
    "clob.balance": {
      description: "Get authenticated balance and allowance",
      authRequired: true,
      schema: balanceSchema,
      execute: (params, headers) => service.clobBalance(headers, params),
    },
    "clob.updateBalance": {
      description: "Refresh authenticated balance and allowance from chain",
      authRequired: true,
      schema: balanceSchema,
      execute: (params, headers) => service.clobUpdateBalance(headers, params),
    },
    "clob.trades": {
      description: "Get authenticated trade history",
      authRequired: true,
      schema: z.object({
        market: z.string().optional(),
        asset_id: z.string().optional(),
        maker_address: addressSchema.optional(),
        limit: z.coerce.number().int().min(1).max(10000).optional(),
      }).strict(),
      execute: (params, headers) => service.clobTrades(headers, params as TradeParams),
    },
    "clob.createApiKey": {
      description: "Create or derive authenticated API key",
      authRequired: true,
      schema: z.object({
        nonce: z.coerce.number().int().nonnegative().optional(),
      }).strict(),
      execute: ({ nonce }, headers) => service.clobCreateApiKey(headers, nonce),
    },
    "clob.createOrder": {
      description: "Create and post a limit order",
      authRequired: true,
      schema: createOrderSchema,
      execute: async (params, headers) => {
        const order: UserOrder & { orderType?: "GTC" | "GTD" | "FOK" | "FAK"; postOnly?: boolean } = {
          ...params,
          side: params.side === "BUY" ? Side.BUY : Side.SELL,
        };
        return service.clobCreateOrder(headers, order);
      },
    },
    "clob.postOrders": {
      description: "Create and post multiple limit orders",
      authRequired: true,
      schema: postOrdersSchema,
      execute: async (params, headers) => {
        const orders = params.orders.map((order: z.infer<typeof createOrderSchema>) => ({
          ...order,
          side: order.side === "BUY" ? Side.BUY : Side.SELL,
        }));

        return service.clobPostOrders(headers, {
          ...params,
          orders,
        });
      },
    },
    "clob.createMarketOrder": {
      description: "Create and post a market order",
      authRequired: true,
      schema: createMarketOrderSchema,
      execute: async (params, headers) => {
        const order: UserMarketOrder & { orderType?: "FOK" | "FAK" } = {
          ...params,
          side: params.side === "BUY" ? Side.BUY : Side.SELL,
        };
        return service.clobCreateMarketOrder(headers, order);
      },
    },
    "clob.cancelOrder": {
      description: "Cancel a single order",
      authRequired: true,
      schema: z.object({ orderId: z.string().min(1) }).strict(),
      execute: ({ orderId }, headers) => service.clobCancelOrder(headers, orderId),
    },
    "clob.cancelOrders": {
      description: "Cancel multiple orders",
      authRequired: true,
      schema: z.object({ orderIds: csvSchema }).strict(),
      execute: ({ orderIds }, headers) => service.clobCancelOrders(headers, orderIds),
    },
    "clob.cancelAll": {
      description: "Cancel all open orders",
      authRequired: true,
      schema: noopSchema,
      execute: (_params, headers) => service.clobCancelAll(headers),
    },
    "clob.cancelMarket": {
      description: "Cancel all orders for a market or asset",
      authRequired: true,
      schema: cancelMarketSchema,
      execute: (params, headers) => service.clobCancelMarket(headers, params),
    },
    "clob.notifications": {
      description: "List authenticated notifications",
      authRequired: true,
      schema: noopSchema,
      execute: (_params, headers) => service.clobNotifications(headers),
    },
    "clob.deleteNotifications": {
      description: "Delete authenticated notifications by IDs or all when omitted",
      authRequired: true,
      schema: z.object({ ids: csvSchema.optional() }).strict(),
      execute: ({ ids }, headers) => service.clobDeleteNotifications(headers, ids),
    },
    "clob.rewards": {
      description: "List authenticated daily reward earnings",
      authRequired: true,
      schema: z.object({ date: dateSchema }).strict(),
      execute: ({ date }, headers) => service.clobRewards(headers, date),
    },
    "clob.earnings": {
      description: "Get authenticated daily total earnings",
      authRequired: true,
      schema: z.object({ date: dateSchema }).strict(),
      execute: ({ date }, headers) => service.clobEarnings(headers, date),
    },
    "clob.earningsMarkets": {
      description: "Get authenticated earnings with reward market config",
      authRequired: true,
      schema: z.object({
        date: dateSchema,
        orderBy: z.string().optional(),
        position: z.string().optional(),
        noCompetition: z.coerce.boolean().optional(),
      }).strict(),
      execute: (params, headers) => service.clobEarningsMarkets(headers, params),
    },
    "clob.rewardPercentages": {
      description: "Get authenticated reward percentages",
      authRequired: true,
      schema: noopSchema,
      execute: (_params, headers) => service.clobRewardPercentages(headers),
    },
    "clob.currentRewards": {
      description: "List current reward programs",
      authRequired: false,
      schema: noopSchema,
      execute: () => service.clobCurrentRewards(),
    },
    "clob.marketReward": {
      description: "Get reward program details for a market",
      authRequired: false,
      schema: z.object({ conditionId: z.string().min(1) }).strict(),
      execute: ({ conditionId }) => service.clobMarketReward(conditionId),
    },
    "clob.orderScoring": {
      description: "Check whether an order is scoring rewards",
      authRequired: true,
      schema: z.object({ orderId: z.string().min(1) }).strict(),
      execute: ({ orderId }, headers) => service.clobOrderScoring(headers, { order_id: orderId }),
    },
    "clob.ordersScoring": {
      description: "Check whether multiple orders are scoring rewards",
      authRequired: true,
      schema: z.object({ orderIds: csvSchema }).strict(),
      execute: ({ orderIds }, headers) => service.clobOrdersScoring(headers, { orderIds }),
    },
    "clob.apiKeys": {
      description: "List authenticated API keys",
      authRequired: true,
      schema: noopSchema,
      execute: (_params, headers) => service.clobApiKeys(headers),
    },
    "clob.deleteApiKey": {
      description: "Delete the current authenticated API key",
      authRequired: true,
      schema: noopSchema,
      execute: (_params, headers) => service.clobDeleteApiKey(headers),
    },
    "clob.accountStatus": {
      description: "Get authenticated account status",
      authRequired: true,
      schema: noopSchema,
      execute: (_params, headers) => service.clobAccountStatus(headers),
    },
  };
}

export type CommandRegistry = ReturnType<typeof buildCommandRegistry>;
export type CommandName = keyof CommandRegistry;

export function listCommands(registry: CommandRegistry): Array<{
  command: CommandName;
  description: string;
  authRequired: boolean;
}> {
  return Object.entries(registry).map(([command, definition]) => ({
    command: command as CommandName,
    description: definition.description,
    authRequired: definition.authRequired,
  }));
}
