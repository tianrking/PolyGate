# CLOB Public Commands

[中文](./clob.zh-CN.md)

## Prerequisites

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

## Health and server time

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

## Price and order book

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

## Markets and trade events

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

## History and rewards

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
