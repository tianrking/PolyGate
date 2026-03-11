# 交易与鉴权 CLOB 命令

[English](./trading.md)

## 前置

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

运行环境需要钱包配置：

- `POLYMARKET_PRIVATE_KEY`
- `POLYMARKET_FUNDER_ADDRESS`（推荐）

## 钱包与账户检查

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"wallet.info","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.accountStatus","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.balance","params":{"assetType":"collateral"}}'
```

## 订单与成交

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.orders","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.trades","params":{"limit":20}}'
```

## API Key 与下单

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.createApiKey","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.createOrder","params":{"tokenID":"123456789","side":"BUY","price":0.42,"size":10,"orderType":"GTC"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.createMarketOrder","params":{"tokenID":"123456789","side":"BUY","amount":10,"orderType":"FOK"}}'
```

## 撤单

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.cancelOrder","params":{"orderId":"0xYOUR_ORDER_ID"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.cancelAll","params":{}}'
```

## 通知与奖励

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.notifications","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.earnings","params":{"date":"2026-03-11"}}'
```
