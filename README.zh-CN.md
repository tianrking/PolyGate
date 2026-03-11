# PolyGate（中文文档）

Polymarket 的统一 HTTP 命令网关，同时支持 Node.js 与 Cloudflare Workers。

[English README](./README.md)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tianrking/PolyGate)

## 目录

1. [项目定位](#项目定位)
2. [核心能力](#核心能力)
3. [当前状态](#当前状态)
4. [架构说明](#架构说明)
5. [命令清单](#命令清单)
6. [API 约定](#api-约定)
7. [本地运行](#本地运行)
8. [Cloudflare 部署](#cloudflare-部署)
9. [鉴权与钱包模型](#鉴权与钱包模型)
10. [Curl 手册](#curl-手册)
11. [安全建议](#安全建议)
12. [路线图](#路线图)

## 项目定位

PolyGate 把 Polymarket 的数据与交易能力统一封装为 HTTP 命令层，适合：

- 机器人与策略执行服务
- 自建后台与运营面板
- 对外数据 API 网关
- 边缘部署（Cloudflare Workers）

它不是 CLI 输出包装器，而是完整服务层，包含：

- 统一命令语义
- 钱包、签名、funder 解析
- 上游错误归一化
- Node 与 Workers 共用同一协议

## 核心能力

- 统一命令执行入口：`POST /api/v1/commands/execute`
- 命令发现入口：`GET /api/v1/commands`
- 健康检查：`GET /health`
- Gamma/Data/CLOB/Bridge 读接口聚合
- CLOB 交易与账户命令
- Approve 与 CTF 链上命令
- Node 与 Workers 双运行时一致

## 当前状态

- `核心网关能力`：Implemented
- `Node 运行时`：Implemented
- `Workers 运行时`：Implemented
- `公共读命令集`：Implemented
- `交易命令集`：Implemented
- `Approve + CTF`：Implemented
- `自动化 Worker 发布`：Implemented
- `独立 docs 命令手册`：Planned

## 架构说明

关键文件：

- `src/commands.ts` 命令注册与参数校验
- `src/services/polymarket-service.ts` 业务编排层
- `src/transport/command-execution.ts` 运行时无关执行器
- `src/worker.ts` Workers 入口
- `src/app.ts` Fastify 入口
- `src/lib/wallet.ts` 钱包与签名/funder 推导
- `src/lib/ctf.ts` CTF 与 approval 工具
- `src/config/node.ts`、`src/config/worker.ts` 配置加载

## 命令清单

实时命令列表以 `GET /api/v1/commands` 为准。

### 基础

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

### Approve 与 CTF

- `approve.check`
- `approve.set`
- `ctf.conditionId`
- `ctf.collectionId`
- `ctf.positionId`
- `ctf.split`
- `ctf.merge`
- `ctf.redeem`
- `ctf.redeemNegRisk`

### CLOB 公共命令

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

### CLOB 鉴权命令

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

## API 约定

### 健康检查

- `GET /health`

### 命令列表

- `GET /api/v1/commands`

### 命令执行

- `POST /api/v1/commands/execute`

请求体示例：

```json
{
  "command": "markets.list",
  "params": {
    "limit": 5
  }
}
```

成功响应示例：

```json
{
  "success": true,
  "command": "markets.list",
  "data": []
}
```

错误响应示例：

```json
{
  "success": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unsupported command: ..."
  }
}
```

## 本地运行

### Node 开发模式

```bash
cp .env.example .env
npm install
npm run dev
```

### Node 生产模式

```bash
npm run build
npm start
```

### 测试

```bash
npm test
```

### Docker

```bash
cp .env.example .env
docker compose up --build
```

## Cloudflare 部署

关键点：

- PolyGate 是 Worker 项目，不是 Pages 静态站点项目。
- 如果你在 Pages 构建里看到 `/opt/buildhome/repo/package.json` 错误，说明部署入口选错了。

### 一键部署

- 使用文档顶部按钮。

### Wrangler CLI

```bash
npx wrangler login
npm install
npm run cf:deploy
```

### GitHub Actions 自动发布

工作流：

- `.github/workflows/deploy-worker.yml`

需要 GitHub Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

触发方式：

- push 到 `main`
- Actions 页面手动触发

### Worker 运行时交易密钥

在 Cloudflare Worker 设置中配置：

- `POLYMARKET_PRIVATE_KEY`
- `POLYMARKET_FUNDER_ADDRESS`（推荐）

## 鉴权与钱包模型

`authRequired: true` 命令需要钱包上下文。

优先级：

1. 请求头覆盖（仅在开启时）
2. 环境变量

关键环境变量：

- `POLYMARKET_PRIVATE_KEY`
- `POLYMARKET_FUNDER_ADDRESS`
- `POLYMARKET_SIGNATURE_TYPE`（`eoa` / `proxy` / `gnosis-safe`）
- `POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE`（默认 `false`）

可选请求头（默认禁用）：

- `x-polymarket-private-key`
- `x-polymarket-signature-type`
- `x-polymarket-funder-address`

## Curl 手册

分类命令示例已拆分到 `docs/curl`：

- [手册索引](./docs/curl/README.zh-CN.md)
- [市场与数据](./docs/curl/markets.zh-CN.md)
- [CLOB 公共查询](./docs/curl/clob.zh-CN.md)
- [Approve 与 CTF](./docs/curl/ctf.zh-CN.md)
- [交易与鉴权命令](./docs/curl/trading.zh-CN.md)

## 安全建议

- 公网环境保持 `POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE=false`
- 不要把交易路由直接裸露在公网
- 建议读接口与交易接口分路由或分域名
- 生产建议增加 Cloudflare Access、WAF、速率限制

## 路线图

状态标识：

- `Implemented`
- `In Development`
- `Planned`

项目项：

- `Implemented`：Node + Workers 双运行时命令网关
- `Implemented`：Gamma/Data/CLOB/Bridge 公共读能力
- `Implemented`：CLOB 交易与账户命令
- `Implemented`：Approve 与 CTF 命令
- `Implemented`：GitHub Actions 自动发版 Worker
- `In Development`：链上写命令集成测试增强
- `Implemented`：按类别拆分 Curl 命令手册到 `docs/curl`
- `Planned`：按命令粒度的鉴权策略模板
- `Planned`：分页辅助和更强类型化 SDK facade
