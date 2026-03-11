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
- Health endpoint: `GET /health`
- Human-friendly homepage: `GET /`
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
- `Dedicated docs/ command cookbook`: Planned

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
      "authRequired": false
    }
  ]
}
```

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

Optional override headers (disabled by default):

- `x-polymarket-private-key`
- `x-polymarket-signature-type`
- `x-polymarket-funder-address`

## Curl Cookbook

Detailed command examples are now split into `docs/curl`:

- [Cookbook index](./docs/curl/README.md)
- [Markets and Data](./docs/curl/markets.md)
- [CLOB Public Data](./docs/curl/clob.md)
- [Approve and CTF](./docs/curl/ctf.md)
- [Trading and Authenticated CLOB](./docs/curl/trading.md)

## Security Notes

- Keep `POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE=false` in public environments.
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
- `In Development`: Expanded integration tests for on-chain write commands
- `Implemented`: Dedicated docs command cookbook split by category
- `Planned`: Optional per-command auth policy profiles
- `Planned`: Pagination helpers and richer typed SDK facade
- `Planned`: Optional webhook/streaming extension for market events

## References

- [Polymarket Docs](https://docs.polymarket.com/)
- [Gamma API docs](https://docs.polymarket.com/developers/gamma-markets-api/get-markets)
- [CLOB Quickstart](https://docs.polymarket.com/quickstart/orders/first-order)
- [Polymarket CLOB TS Client](https://github.com/Polymarket/clob-client)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
