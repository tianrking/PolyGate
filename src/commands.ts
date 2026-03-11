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
    "clob.midpoint": {
      description: "Get token midpoint",
      authRequired: false,
      schema: z.object({ tokenId: z.string().min(1) }).strict(),
      execute: ({ tokenId }) => service.clobMidpoint(tokenId),
    },
    "clob.book": {
      description: "Get order book summary",
      authRequired: false,
      schema: z.object({ tokenId: z.string().min(1) }).strict(),
      execute: ({ tokenId }) => service.clobBook(tokenId),
    },
    "clob.market": {
      description: "Get CLOB market by condition ID",
      authRequired: false,
      schema: z.object({ conditionId: z.string().min(1) }).strict(),
      execute: ({ conditionId }) => service.clobMarket(conditionId),
    },
    "clob.markets": {
      description: "List CLOB markets",
      authRequired: false,
      schema: z.object({ cursor: z.string().optional() }).strict(),
      execute: ({ cursor }) => service.clobMarkets(cursor),
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
      schema: z.object({
        assetType: z.enum(["collateral", "conditional"]),
        tokenId: z.string().optional(),
      }).strict(),
      execute: (params, headers) => service.clobBalance(headers, params),
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
    "clob.cancelAll": {
      description: "Cancel all open orders",
      authRequired: true,
      schema: noopSchema,
      execute: (_params, headers) => service.clobCancelAll(headers),
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
