# PolyGate

Unified HTTP command gateway for Polymarket, designed for both Node.js and Cloudflare Workers.

[中文文档 / Chinese README](./README.zh-CN.md)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tianrking/PolyGate)

## Table of Contents

1. [What It Is](#what-it-is)
2. [Key Capabilities](#key-capabilities)
3. [Project Status](#project-status)
4. [Architecture](#architecture)
5. [Command Catalog](#command-catalog)
6. [API Contract](#api-contract)
7. [Local Development](#local-development)
8. [Cloudflare Deployment](#cloudflare-deployment)
9. [Authentication and Wallet Model](#authentication-and-wallet-model)
10. [Curl Cookbook](#curl-cookbook)
11. [Security Notes](#security-notes)
12. [Roadmap](#roadmap)
13. [References](#references)

## What It Is

PolyGate turns Polymarket capabilities into a stable HTTP command layer for:

- bots and strategy workers
- internal backends and dashboards
- low-friction public data APIs
- edge deployment with Cloudflare Workers

This project is not a thin shell around CLI output. It provides:

- normalized command semantics
- shared wallet/signature/funder logic
- consistent upstream error handling
- one protocol for both Node and Workers runtimes

## Key Capabilities

- Unified command endpoint: `POST /api/v1/commands/execute`
- Command discovery endpoint: `GET /api/v1/commands`
- Command details endpoint: `GET /api/v1/commands/:command`
- Command manifest endpoint: `GET /api/v1/manifest`
- Event stream endpoint: `GET /api/v1/events/stream` (SSE)
- Health endpoint: `GET /health`
- Human-friendly homepage: `GET /`
- Interactive homepage console for command selection, parameter editing, and live execution
- Optional per-command policy controls (`POLYGATE_DISABLED_COMMANDS`, `POLYGATE_FORCE_AUTH_COMMANDS`)
- Application-layer API token guard for private commands (`authRequired: true`)
- Optional webhook delivery for command execution events
- Public data support across Gamma, Data API, CLOB public endpoints, and Bridge
- Authenticated trading and account commands through `@polymarket/clob-client`
- On-chain approval and CTF command support via `viem`
- Node service mode and Cloudflare Worker mode using a shared command registry

## Project Status

- `Core HTTP Gateway`: Implemented
- `Node Runtime`: Implemented
- `Cloudflare Workers Runtime`: Implemented
- `Gamma/Data/CLOB Public Read Commands`: Implemented
- `CLOB Authenticated Trading Commands`: Implemented
- `Approve + CTF Commands`: Implemented
- `Automated Workers Deploy (GitHub Actions)`: Implemented
- `Dedicated docs/ command cookbook`: Implemented
- `Per-command auth policy profiles`: Implemented
- `Webhook + SSE command event delivery`: Implemented
- `Application-layer API token auth for private commands`: Implemented

## Architecture

Core files:

- `src/commands.ts` command registry and validation
- `src/services/polymarket-service.ts` orchestration across upstreams
- `src/transport/command-execution.ts` runtime-agnostic command executor
- `src/worker.ts` Cloudflare Worker entry
- `src/app.ts` Fastify app entry
- `src/lib/wallet.ts` signer/signature/funder resolution
- `src/lib/ctf.ts` CTF and approval helpers
- `src/config/node.ts` and `src/config/worker.ts` runtime config loaders

Runtime model:

- Same command protocol on both runtimes
- Shared service layer for feature parity
- Runtime-specific HTTP host layer only

## Command Catalog

The authoritative live list is always:

- `GET /api/v1/commands`

Current command groups:

- `status`
- `wallet.info`

### Gamma

- `markets.list`
- `markets.get`
- `markets.search`
- `markets.tags`
- `events.list`
- `events.get`
- `events.tags`
- `tags.list`
- `tags.get`
- `tags.related`
- `tags.relatedTags`
- `series.list`
- `series.get`
- `comments.list`
- `comments.get`
- `comments.byUser`
- `profiles.get`
- `sports.list`
- `sports.marketTypes`
- `sports.teams`

### Data API

- `data.positions`
- `data.value`
- `data.trades`
- `data.closedPositions`
- `data.traded`
- `data.activity`
- `data.holders`
- `data.openInterest`
- `data.volume`
- `data.leaderboard`
- `data.builderLeaderboard`
- `data.builderVolume`

### Bridge

- `bridge.deposit`
- `bridge.supportedAssets`
- `bridge.status`

### Approvals and CTF

- `approve.check`
- `approve.set`
- `ctf.conditionId`
- `ctf.collectionId`
- `ctf.positionId`
- `ctf.split`
- `ctf.merge`
- `ctf.redeem`
- `ctf.redeemNegRisk`

### CLOB Public

- `clob.ok`
- `clob.price`
- `clob.prices`
- `clob.midpoint`
- `clob.midpoints`
- `clob.spread`
- `clob.spreads`
- `clob.book`
- `clob.books`
- `clob.lastTrade`
- `clob.lastTrades`
- `clob.market`
- `clob.marketTrades`
- `clob.markets`
- `clob.samplingMarkets`
- `clob.simplifiedMarkets`
- `clob.samplingSimplifiedMarkets`
- `clob.tickSize`
- `clob.feeRate`
- `clob.negRisk`
- `clob.priceHistory`
- `clob.time`
- `clob.currentRewards`
- `clob.marketReward`

### CLOB Authenticated

- `clob.orders`
- `clob.order`
- `clob.balance`
- `clob.updateBalance`
- `clob.trades`
- `clob.createApiKey`
- `clob.createOrder`
- `clob.postOrders`
- `clob.createMarketOrder`
- `clob.cancelOrder`
- `clob.cancelOrders`
- `clob.cancelAll`
- `clob.cancelMarket`
- `clob.notifications`
- `clob.deleteNotifications`
- `clob.rewards`
- `clob.earnings`
- `clob.earningsMarkets`
- `clob.rewardPercentages`
- `clob.orderScoring`
- `clob.ordersScoring`
- `clob.apiKeys`
- `clob.deleteApiKey`
- `clob.accountStatus`

## API Contract

### Health

- `GET /health`

Response:

```json
{
  "ok": true,
  "service": "PolyGate"
}
```

### List Commands

- `GET /api/v1/commands`

Response shape:

```json
{
  "success": true,
  "data": [
    {
      "command": "markets.list",
      "description": "List Gamma markets",
      "authRequired": false,
      "enabled": true
    }
  ]
}
```

### Command Details

- `GET /api/v1/commands/:command`

Returns one command with:

- auth requirement
- enabled/disabled state under policy
- request params JSON schema
- generated params example
- generated curl example

### Command Manifest

- `GET /api/v1/manifest`

Returns full metadata for all commands in one response, useful for SDK generation and integration automation.

### Event Stream (SSE)

- `GET /api/v1/events/stream`

Returns realtime `command.execution` events using `text/event-stream`.

### Homepage

- `GET /`

Returns a lightweight HTML landing page with quick usage guidance, endpoint links, and curl examples.
Language switch is built-in: `/?lang=en` and `/?lang=zh-CN`.

### Execute Command

- `POST /api/v1/commands/execute`

Request shape:

```json
{
  "command": "markets.list",
  "params": {
    "limit": 5
  }
}
```

Success shape:

```json
{
  "success": true,
  "command": "markets.list",
  "data": []
}
```

Error shape:

```json
{
  "success": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unsupported command: ..."
  }
}
```

## Local Development

### Node (dev)

```bash
cp .env.example .env
npm install
npm run dev
```

### Node (prod-like local)

```bash
npm run build
npm start
```

### Tests

```bash
npm test
```

### Chain write integration tests (approve/ctf)

These tests submit real on-chain transactions and are disabled by default.

Required env vars:

- `POLYMARKET_PRIVATE_KEY` (funded wallet)
- `POLYGATE_CHAIN_TEST_SPLIT_CONDITION_ID` (prepared condition for split/merge)
- `POLYGATE_CHAIN_TEST_REDEEM_CONDITION_ID` (resolved condition for redeem)

Optional env vars:

- `POLYGATE_CHAIN_TEST_API_TOKEN` (default: `chain-test-token`)
- `POLYGATE_CHAIN_TEST_SPLIT_AMOUNT` (default: `0.1`)
- `POLYGATE_CHAIN_TEST_PARTITION` (default: `1,2`)
- `POLYGATE_CHAIN_TEST_REDEEM_INDEX_SETS` (default: `1,2`)
- `POLYGATE_CHAIN_TEST_COLLATERAL`
- `POLYGATE_CHAIN_TEST_PARENT_COLLECTION_ID` (default: zero bytes32)

Run:

```bash
npm run test:chain
```

### Docker

```bash
cp .env.example .env
docker compose up --build
```

## Cloudflare Deployment

Important:

- PolyGate is a Worker project, not a Pages static site.
- If you see a Pages build error like missing `/opt/buildhome/repo/package.json`, deploy path is wrong.

### One-click

- Use the deploy button at the top of this README.

### Wrangler CLI

```bash
npx wrangler login
npm install
npm run cf:deploy
```

### GitHub Actions auto-deploy

Workflow:

- `.github/workflows/deploy-worker.yml`

Required GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Deployment trigger:

- push to `main`
- manual dispatch from Actions UI

### Worker runtime secrets (for trading commands)

Configure in Cloudflare Worker settings:

- `POLYMARKET_PRIVATE_KEY`
- `POLYMARKET_FUNDER_ADDRESS` (recommended)

These are distinct from GitHub Secrets.

## Authentication and Wallet Model

Commands marked `authRequired: true` require a configured wallet context.

Priority order:

1. request-header override (only if enabled)
2. Worker/Node environment configuration

Relevant env vars:

- `POLYMARKET_PRIVATE_KEY`
- `POLYMARKET_FUNDER_ADDRESS`
- `POLYMARKET_SIGNATURE_TYPE` (`eoa`, `proxy`, `gnosis-safe`)
- `POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE` (`false` by default)
- `POLYGATE_DISABLED_COMMANDS` (comma-separated command blocklist)
- `POLYGATE_FORCE_AUTH_COMMANDS` (comma-separated commands that must have wallet context)
- `POLYGATE_REQUIRE_API_TOKEN_FOR_PRIVATE` (`true` by default)
- `POLYGATE_API_TOKENS` (comma-separated valid API tokens for private commands)
- `POLYGATE_API_TOKEN_HEADER` (default `x-polygate-token`)
- `POLYGATE_WEBHOOK_URL` (optional command event receiver URL)
- `POLYGATE_WEBHOOK_BEARER_TOKEN` (optional bearer token for webhook delivery)
- `POLYGATE_WEBHOOK_TIMEOUT_MS` (webhook timeout, default `5000`)
- `POLYGATE_SSE_HEARTBEAT_MS` (SSE heartbeat interval, default `15000`)

Optional override headers (disabled by default):

- `x-polymarket-private-key`
- `x-polymarket-signature-type`
- `x-polymarket-funder-address`

Private command token headers:

- `x-polygate-token` (or your configured `POLYGATE_API_TOKEN_HEADER`)
- `Authorization: Bearer <token>`

## Curl Cookbook

Detailed command examples are now split into `docs/curl`:

- [Cookbook index](./docs/curl/README.md)
- [Markets and Data](./docs/curl/markets.md)
- [CLOB Public Data](./docs/curl/clob.md)
- [Approve and CTF](./docs/curl/ctf.md)
- [Trading and Authenticated CLOB](./docs/curl/trading.md)

## Security Notes

- Keep `POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE=false` in public environments.
- Keep `POLYGATE_REQUIRE_API_TOKEN_FOR_PRIVATE=true` and set strong `POLYGATE_API_TOKENS`.
- Never expose private trading routes without access control.
- Prefer split routing for public read vs private trading.
- For production: add Cloudflare Access, WAF, and rate rules.

## Roadmap

Status legend:

- `Implemented`
- `In Development`
- `Planned`

Items:

- `Implemented`: Unified Node + Worker command gateway
- `Implemented`: Full public read stack (Gamma/Data/CLOB/Bridge)
- `Implemented`: CLOB trading and account command set
- `Implemented`: Approve and CTF execution commands
- `Implemented`: GitHub Actions Worker deployment flow
- `Implemented`: Chain integration tests for `approve.set` / `ctf.split` / `ctf.merge` / `ctf.redeem` (env-gated)
- `Implemented`: Dedicated docs command cookbook split by category
- `Implemented`: Optional per-command auth policy profiles
- `Planned`: Pagination helpers and richer typed SDK facade
- `Implemented`: Optional webhook and SSE streaming extension for command events

## References

- [Polymarket Docs](https://docs.polymarket.com/)
- [Gamma API docs](https://docs.polymarket.com/developers/gamma-markets-api/get-markets)
- [CLOB Quickstart](https://docs.polymarket.com/quickstart/orders/first-order)
- [Polymarket CLOB TS Client](https://github.com/Polymarket/clob-client)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
