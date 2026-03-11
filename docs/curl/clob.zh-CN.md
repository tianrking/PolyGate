# CLOB 公共命令

[English](./clob.md)

## 前置

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

## 健康与时间

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.ok","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.time","params":{}}'
```

## 价格与订单簿

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.price","params":{"tokenId":"123456789","side":"BUY"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.book","params":{"tokenId":"123456789"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.spread","params":{"tokenId":"123456789"}}'
```

## 市场与成交事件

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.markets","params":{}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.market","params":{"conditionId":"0xbcee96a610b7f4e61e2947f6510d1a15d4ae7c961a556b014db3527975047a1a"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.marketTrades","params":{"conditionId":"0xbcee96a610b7f4e61e2947f6510d1a15d4ae7c961a556b014db3527975047a1a"}}'
```

## 历史与奖励

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.priceHistory","params":{"tokenId":"123456789","interval":"1d","fidelity":50}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.currentRewards","params":{}}'
```
