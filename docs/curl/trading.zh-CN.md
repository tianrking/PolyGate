# 交易与鉴权 CLOB 命令

[English](./trading.md)

## 前置

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
export API_TOKEN="replace-with-your-token"
```

运行环境需要钱包配置：

- `POLYMARKET_PRIVATE_KEY`
- `POLYMARKET_FUNDER_ADDRESS`（推荐）

本页私有命令默认还需要 API token 请求头：

- `x-polygate-token: $API_TOKEN`

## 钱包与账户检查

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"wallet.info","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.accountStatus","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.balance","params":{"assetType":"collateral"}}'
```

## 订单与成交

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.orders","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.trades","params":{"limit":20}}'
```

## API Key 与下单

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.createApiKey","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.createOrder","params":{"tokenID":"123456789","side":"BUY","price":0.42,"size":10,"orderType":"GTC"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.createMarketOrder","params":{"tokenID":"123456789","side":"BUY","amount":10,"orderType":"FOK"}}'
```

## 撤单

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.cancelOrder","params":{"orderId":"0xYOUR_ORDER_ID"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.cancelAll","params":{}}'
```

## 通知与奖励

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.notifications","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"clob.earnings","params":{"date":"2026-03-11"}}'
```

## 失败排查

- `WALLET_REQUIRED`：调用鉴权命令时没有配置钱包。修复方式：在运行时配置私钥和 funder。
- `API_TOKEN_REQUIRED` / `API_TOKEN_INVALID`：私有命令缺少或携带了无效 token。修复方式：配置 `POLYGATE_API_TOKENS` 并携带 `x-polygate-token`。
- `PRIVATE_KEY_OVERRIDE_DISABLED`：请求头私钥覆盖被禁用。修复方式：生产环境使用运行时 secret，或仅在受信内网显式开启覆盖。
- `VALIDATION_ERROR`：请求体字段不匹配，例如 `tokenID` 拼错。修复方式：直接参考 `/api/v1/commands` 返回的参数结构。
- 带 `clob` 的 `UPSTREAM_ERROR`：CLOB 接口暂不可用或超时。修复方式：重试，并降低下单突发并发。
