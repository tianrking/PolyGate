# PolyGate

Unified HTTP command gateway for Polymarket, designed to run cleanly on both Node.js and Cloudflare Workers.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tianrking/PolyGate)

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
- Approve 命令：
  - `approve.check`
  - `approve.set`
- CTF 命令：
  - `ctf.conditionId`
  - `ctf.collectionId`
  - `ctf.positionId`
  - `ctf.split`
  - `ctf.merge`
  - `ctf.redeem`
  - `ctf.redeemNegRisk`
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

### 最重要的一点

`PolyGate` 是 Cloudflare Worker，不是 Cloudflare Pages 静态站点。

如果你在 Cloudflare 后台看到了这种报错：

```text
npm error enoent Could not read package.json: /opt/buildhome/repo/package.json
```

通常不是仓库里真的没有 `package.json`，而是你把它按 `Pages + build command` 的方式接进去了。

正确做法是二选一：

- 用 `Wrangler` 直接部署 Worker
- 用 GitHub Actions 自动部署 Worker

不推荐再走传统 Pages 的 `npm run build` 流程。

### 一键部署

如果你已经把仓库推到了 GitHub，最省事的方式就是点上面的 `Deploy to Cloudflare` 按钮。

Cloudflare 会自动做这些事：

- 从 GitHub 拉取 `PolyGate`
- 按 [wrangler.toml](/Users/w0x7ce/Downloads/Poly_Watcher/polymarket-node-http/wrangler.toml) 创建 Worker
- 使用仓库里的默认 `vars`
- 给你一个 `*.workers.dev` 域名

按钮部署完成后，建议立刻做两件事：

1. 到 Worker 设置页补上 Secrets
2. 访问 `/health` 和 `/api/v1/commands` 做烟测

### CLI 部署

如果你更喜欢命令行，流程如下。

本地 Workers 调试：

```bash
cd /Users/w0x7ce/Downloads/Poly_Watcher/polymarket-node-http
cp .dev.vars.example .dev.vars
npm install
npm run cf:dev
```

部署到 Cloudflare：

```bash
npx wrangler login
npm run cf:deploy
```

如果需要交易能力，把私钥作为 secret 注入，不要写进 `wrangler.toml`：

```bash
npx wrangler secret put POLYMARKET_PRIVATE_KEY
npx wrangler secret put POLYMARKET_FUNDER_ADDRESS
```

如果你需要自定义签名方式，也可以补：

```bash
npx wrangler secret put POLYMARKET_SIGNATURE_TYPE
```

更常见的做法是把 `POLYMARKET_SIGNATURE_TYPE` 继续放在 [wrangler.toml](/Users/w0x7ce/Downloads/Poly_Watcher/polymarket-node-http/wrangler.toml) 里，用默认的 `proxy` 模式。

### GitHub Actions 自动部署

仓库已经内置了自动部署工作流：

- [deploy-worker.yml](/Users/w0x7ce/Downloads/Poly_Watcher/polymarket-node-http/.github/workflows/deploy-worker.yml)

它会在这些场景触发：

- push 到 `main`
- GitHub Actions 手动触发

工作流会先做：

- `npm ci`
- `npm run build`
- `npm test`

然后再执行 Wrangler 部署。

你只需要在 GitHub 仓库里配置两个 Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

其中：

- `CLOUDFLARE_ACCOUNT_ID` 可以在 Cloudflare Dashboard 右侧账户信息里看到
- `CLOUDFLARE_API_TOKEN` 建议给最小权限，只开 Workers 部署所需权限

如果还要让 Worker 具备交易能力，再去 Cloudflare Worker 环境里配置：

- `POLYMARKET_PRIVATE_KEY`
- `POLYMARKET_FUNDER_ADDRESS`

GitHub Secrets 和 Cloudflare Worker Secrets 不是一回事：

- GitHub Secrets 用来让 CI 有权限发版
- Cloudflare Worker Secrets 用来让运行中的 Worker 拿到私钥

典型流程：

1. 在 GitHub 仓库设置 `CLOUDFLARE_API_TOKEN`
2. 在 GitHub 仓库设置 `CLOUDFLARE_ACCOUNT_ID`
3. push 到 `main`
4. GitHub Actions 自动把最新版本发布到 Workers

如果你不想每次 push 都部署，也可以直接在 GitHub 的 `Actions` 页面手动运行 `Deploy Worker`。

### Dashboard 部署

如果你不想用 CLI，也可以在 Cloudflare Dashboard 里操作：

1. 打开 `Workers & Pages`
2. 选择 `Create`
3. 选择导入 GitHub 仓库 `tianrking/PolyGate`
4. 确认你创建的是 `Worker`，不是 `Pages`
5. 构建命令留空
6. 让 Cloudflare 直接按仓库里的 Wrangler 配置打包部署，不需要你额外写传统前端项目那种 build/deploy 命令
7. 补齐 Variables 和 Secrets

这里最重要的是区分：

- `vars`：非敏感配置，已经在 [wrangler.toml](/Users/w0x7ce/Downloads/Poly_Watcher/polymarket-node-http/wrangler.toml) 里
- `secrets`：敏感配置，比如私钥，必须在 Dashboard 或 Wrangler Secret 里设置

### 推荐的 Secrets

只读模式：

- 不需要任何 Secrets

交易模式：

- `POLYMARKET_PRIVATE_KEY`
- `POLYMARKET_FUNDER_ADDRESS`

通常不建议开启：

- `POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE=true`

这个选项会允许调用方通过请求头临时注入私钥，只适合你完全控制调用方的内网环境。

### 部署后验证

假设 Cloudflare 返回的地址是 `https://polygate.<subdomain>.workers.dev`，可以先跑这三条：

```bash
curl https://polygate.<subdomain>.workers.dev/health
curl https://polygate.<subdomain>.workers.dev/api/v1/commands
curl -X POST https://polygate.<subdomain>.workers.dev/api/v1/commands/execute \
  -H 'content-type: application/json' \
  -d '{"command":"markets.list","params":{"limit":5}}'
```

如果你启用了交易钱包，再验证一个需要鉴权的钱包上下文命令：

```bash
curl -X POST https://polygate.<subdomain>.workers.dev/api/v1/commands/execute \
  -H 'content-type: application/json' \
  -d '{"command":"wallet.info","params":{}}'
```

### 更新和回滚

更新部署：

```bash
git push origin main
npm run cf:deploy
```

如果你是通过 Dashboard 连接 GitHub，也可以直接从最新提交重新部署。

回滚最简单的做法不是在 Dashboard 里手工乱改，而是：

1. 回到目标 git commit
2. 重新执行 `npm run cf:deploy`

这样代码和部署状态能保持一致。

### 自定义域名

部署完成后，你可以在 Cloudflare Dashboard 里给 Worker 绑定自己的域名，例如：

- `api.polygate.app`
- `polymarket.yourdomain.com`

绑定后建议至少做两件事：

- 开 Cloudflare Access 或 WAF 规则保护交易命令
- 对公开只读接口和私有交易接口使用不同域名或不同路由

### 生产建议

最稳的生产形态通常是：

- Cloudflare Workers 承载只读接口和低频交易
- 私有交易命令前面加 Access / API Gateway / 自定义鉴权
- 不把高权限钱包直接暴露给公开互联网

如果你要纯公开部署，最推荐公开的还是这些命令：

- `markets.*`
- `events.*`
- `tags.*`
- `series.*`
- `sports.*`
- `data.*`
- `clob` 下的大部分只读命令

### 常见问题

`deploy 后 500`

- 先看 Cloudflare Worker 日志
- 再检查 Secrets 是否缺失
- 再检查上游 API 是否暂时超时

`交易命令返回 WALLET_REQUIRED`

- 说明 Worker 环境里没有 `POLYMARKET_PRIVATE_KEY`
- 或者 funder/signature 组合不完整

`请求慢`

- `clob.currentRewards` 这类接口数据量本来就大
- 读接口适合加 Cloudflare Cache 或你自己的前置缓存

`为什么有些命令适合 Workers，有些更适合 Node`

- Workers 很适合公开 HTTP 网关
- 链上执行和高敏感交易如果频率高，Node 常驻服务更好调试和运维

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

检查交易授权状态：

```bash
curl -X POST http://127.0.0.1:3107/api/v1/commands/execute \
  -H 'content-type: application/json' \
  -d '{"command":"approve.check","params":{"address":"0x1111111111111111111111111111111111111111"}}'
```

计算条件 ID：

```bash
curl -X POST http://127.0.0.1:3107/api/v1/commands/execute \
  -H 'content-type: application/json' \
  -d '{
    "command":"ctf.conditionId",
    "params":{
      "oracle":"0x1111111111111111111111111111111111111111",
      "questionId":"0x2222222222222222222222222222222222222222222222222222222222222222",
      "outcomes":2
    }
  }'
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
