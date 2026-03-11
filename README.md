# PolyGate

Unified HTTP command gateway for Polymarket, designed to run cleanly on both Node.js and Cloudflare Workers.

这是一个基于当前目录 `polymarket-cli` 思路重构出来的 TypeScript 项目。它不是把 Rust CLI 生硬包一层壳，而是把高价值能力抽成了一个可部署的 HTTP 命令服务：

- 读接口直接走 Gamma/Data/CLOB 官方 HTTP API
- 交易接口走官方 `@polymarket/clob-client`
- 钱包上下文、funder 推导、API key 衍生和错误语义统一由服务层处理
- 同一套命令协议同时支持 Node 常驻服务和 Cloudflare Workers

## 为什么这个方向可行

Rust CLI 的核心不是 UI，而是三层能力：

1. 命令语义层：`markets`、`events`、`clob`、`data`、`wallet`
2. 认证层：私钥解析、签名类型、代理钱包推导
3. Polymarket SDK/API 调用层

Node 侧同样具备对应能力：

- CLOB 有官方 TypeScript 客户端 `@polymarket/clob-client`
- Gamma/Data 本身就是公开 HTTP API
- `viem` 可以稳定完成地址校验、钱包生成和 CREATE2 推导

所以结论不是“勉强能做”，而是“完全能做，而且服务化比继续堆 CLI 更适合服务器部署”。现在这个项目已经同时支持：

- 普通服务器 / Docker / VPS
- Cloudflare Workers

## 设计目标

- 一个统一的 HTTP 命令入口，而不是一堆离散脚本
- 同一套命令语义覆盖 Node 和 Workers
- 对交易命令保留明确的钱包、签名和 funder 语义
- 对只读命令尽量轻量、高性能、低部署成本
- 对公开部署保留基本的安全边界和运维可读性

## 当前已实现

- Fastify 服务，支持限流、CORS、基础安全头、敏感请求头脱敏日志
- Cloudflare Workers 入口，使用 Hono 适配边缘运行时
- 聚合状态检查：`status`
- Gamma 命令：
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
- Data 命令：
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
- Bridge 命令：
  - `bridge.deposit`
  - `bridge.supportedAssets`
  - `bridge.status`
- CLOB 公共命令：
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
- CLOB 鉴权命令：
  - `clob.orders`
  - `clob.order`
  - `clob.balance`
  - `clob.updateBalance`
  - `clob.trades`
  - `clob.notifications`
  - `clob.deleteNotifications`
  - `clob.rewards`
  - `clob.earnings`
  - `clob.earningsMarkets`
  - `clob.rewardPercentages`
  - `clob.orderScoring`
  - `clob.ordersScoring`
  - `clob.apiKeys`
  - `clob.createApiKey`
  - `clob.postOrders`
  - `clob.createOrder`
  - `clob.createMarketOrder`
  - `clob.cancelOrders`
  - `clob.cancelOrder`
  - `clob.cancelMarket`
  - `clob.cancelAll`
  - `clob.deleteApiKey`
  - `clob.accountStatus`
- 钱包检查：
  - `wallet.info`

## 适用场景

- 给自动化程序、机器人、后台任务统一提供 Polymarket HTTP 接口
- 把原本终端里的 Polymarket CLI 语义服务化
- 部署成 Cloudflare Workers 做轻量公共网关
- 部署成 Node 服务承载更完整的交易能力

## 目录结构

```text
src/config/schema.ts             运行时配置 schema
src/config/node.ts               Node 配置入口
src/config/worker.ts             Workers 配置入口
src/lib/http.ts                  上游 HTTP 请求封装
src/lib/wallet.ts                私钥、签名模式、proxy/safe funder 推导
src/services/polymarket-service.ts  Polymarket 能力聚合层
src/commands.ts                  HTTP 命令注册表
src/transport/command-execution.ts  跨运行时命令执行器
src/app.ts                       Fastify 应用
src/server.ts                    启动入口
src/worker.ts                    Cloudflare Workers 入口
wrangler.toml                    Workers 部署配置
Dockerfile                       Node 容器镜像
docker-compose.yml               本地/服务器容器编排
tests/wallet.test.ts             funder 推导一致性测试
```

## Node 运行

```bash
cd /Users/w0x7ce/Downloads/Poly_Watcher/polymarket-node-http
cp .env.example .env
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm start
```

Docker 运行：

```bash
cp .env.example .env
docker compose up --build
```

## Cloudflare Workers 运行

本地 Workers 调试：

```bash
cd /Users/w0x7ce/Downloads/Poly_Watcher/polymarket-node-http
cp .dev.vars.example .dev.vars
npm install
npm run cf:dev
```

部署到 Cloudflare：

```bash
npm run cf:deploy
```

如果需要交易能力，把私钥作为 secret 注入，不要写进 `wrangler.toml`：

```bash
npx wrangler secret put POLYMARKET_PRIVATE_KEY
npx wrangler secret put POLYMARKET_FUNDER_ADDRESS
```

## Cloudflare 是否真的可用

当前不是“理论支持”，而是已经做了本地验证：

- `npm run build` 通过
- `npm test` 通过
- `npx wrangler deploy --dry-run` 打包通过
- `npx wrangler dev --local` 已实测通过以下接口：
  - `GET /health`
  - `GET /api/v1/commands`
  - `POST /api/v1/commands/execute`

也就是说，至少从只读链路看，Workers 版本已经是可运行状态。

如果你把项目推到 GitHub，可以把下面这行放进 README 做 Cloudflare 一键部署按钮：

```md
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/<your-org>/<your-repo>)
```

## HTTP 调用方式

服务接口统一为：

- `GET /health`
- `GET /api/v1/commands`
- `POST /api/v1/commands/execute`

健康检查：

```bash
curl http://127.0.0.1:3107/health
```

列出支持命令：

```bash
curl http://127.0.0.1:3107/api/v1/commands
```

获取标签列表：

```bash
curl -X POST http://127.0.0.1:3107/api/v1/commands/execute \
  -H 'content-type: application/json' \
  -d '{"command":"tags.list","params":{"limit":10}}'
```

获取市场列表：

```bash
curl -X POST http://127.0.0.1:3107/api/v1/commands/execute \
  -H 'content-type: application/json' \
  -d '{"command":"markets.list","params":{"limit":5}}'
```

查询订单簿：

```bash
curl -X POST http://127.0.0.1:3107/api/v1/commands/execute \
  -H 'content-type: application/json' \
  -d '{"command":"clob.book","params":{"tokenId":"123456789"}}'
```

批量挂多个限价单：

```bash
curl -X POST http://127.0.0.1:3107/api/v1/commands/execute \
  -H 'content-type: application/json' \
  -d '{
    "command":"clob.postOrders",
    "params":{
      "orders":[
        {"tokenID":"123456789","side":"BUY","price":0.42,"size":10},
        {"tokenID":"987654321","side":"SELL","price":0.65,"size":5,"postOnly":true}
      ],
      "defaultOrderType":"GTC"
    }
  }'
```

服务端钱包模式下下限价单：

```bash
curl -X POST http://127.0.0.1:3107/api/v1/commands/execute \
  -H 'content-type: application/json' \
  -d '{
    "command":"clob.createOrder",
    "params":{
      "tokenID":"123456789",
      "side":"BUY",
      "price":0.42,
      "size":10,
      "orderType":"GTC"
    }
  }'
```

如果确实需要由请求方临时带私钥，可以显式开启 `POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE=true`，然后传请求头：

```text
x-polymarket-private-key
x-polymarket-signature-type
x-polymarket-funder-address
```

默认不建议开启。

返回格式统一为：

```json
{
  "success": true,
  "command": "markets.list",
  "data": []
}
```

错误格式统一为：

```json
{
  "success": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unsupported command: ..."
  }
}
```

## Workers 模式的实际判断

如果你的目标是“全网可访问、低维护、直接 HTTP 调用”，Cloudflare Workers 很实用，尤其适合：

- `markets/events/data/clob public` 这类只读查询
- 中低频交易命令
- 对外暴露统一 API，而不是暴露一台原始服务器

但要明确两点：

- Workers 不是传统常驻进程，内存缓存是优化，不是强持久化保证
- 高敏感交易生产环境仍建议配合 Cloudflare Access、WAF、IP 限制或你自己的鉴权层

所以结论不是“不能上 Workers”，而是“可以上，而且很实用，但安全边界要自己管住”。

## 安全和可靠性设计

- 默认使用服务端环境变量中的钱包，不把私钥放进 URL 或日志
- 请求头中的私钥默认禁用，必须显式打开
- 对 `x-polymarket-private-key` 和 `authorization` 做日志脱敏
- 对 CLOB API key 做内存缓存，避免每次交易都重新做 L1/L2 初始化
- `proxy` 和 `gnosis-safe` 的 funder 地址按 Rust SDK 同样的 CREATE2 规则推导
- 统一 JSON 错误返回，不把 Fastify 原始异常直接暴露给调用方
- Workers 版和 Node 版共享同一套命令注册表，避免两套 API 分叉

## CI

项目内置了 GitHub Actions 工作流：

- `npm ci`
- `npm run build`
- `npm test`
- `wrangler deploy --dry-run`

工作流文件位于 [.github/workflows/ci.yml](/Users/w0x7ce/Downloads/Poly_Watcher/polymarket-node-http/.github/workflows/ci.yml)。

## 与 Rust CLI 的差距

当前项目已经证明 Node 服务化方案可落地，但还没有覆盖 Rust CLI 的全部命令：

- `approve`
- `ctf`
- `bridge`
- `comments`
- `profiles`
- `series`
- `sports`
- `tags`
- `shell`
- `setup`
- `upgrade`

这些不是做不到，而是优先级低于“服务器可调用的读接口 + 交易闭环”。现有结构已经支持继续把这些命令按同样方式挂到 `src/commands.ts`。

## 仓库名

当前仓库名：`PolyGate`

这个名字的好处是：

- 短，容易记
- 不绑死 CLI、Node 或 Workers
- 既像产品名，也像基础设施项目名

## 推荐下一步

1. 继续补 `approve` 和 `ctf`，打通链上授权与赎回闭环
2. 为每个命令补请求/响应示例和契约测试
3. 增加只读 API key 模式与更细粒度的权限控制
4. 如果要多租户部署，把钱包上下文从环境变量迁移到密钥管理服务
5. 如果仓库准备公开，再把 README 顶部的 Cloudflare Deploy 按钮 URL 改成真实仓库地址
