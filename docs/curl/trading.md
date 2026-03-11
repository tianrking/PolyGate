# Trading and Authenticated CLOB Commands

[中文](./trading.zh-CN.md)

## Prerequisites

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

Runtime must provide wallet context:

- `POLYMARKET_PRIVATE_KEY`
- `POLYMARKET_FUNDER_ADDRESS` (recommended)

## Wallet context and account checks

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

## Orders and trades

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

## Create API key and place orders

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

## Cancel orders

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

## Notifications and rewards

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
