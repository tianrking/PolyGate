# Quickstart (Read-Only)

[中文](./quickstart-readonly.zh-CN.md)

This path is for users who only need market/query data and want zero wallet setup.

## 1) Set base URL

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

## 2) Service sanity check

```bash
curl "$BASE_URL/health"
curl "$BASE_URL/api/v1/commands"
```

## 3) Fetch market/event snapshots

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"markets.list","params":{"limit":10}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"events.list","params":{"limit":10}}'
```

## 4) Fetch CLOB public depth/price

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.book","params":{"tokenId":"123456789"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"clob.price","params":{"tokenId":"123456789","side":"BUY"}}'
```

## Next docs

- Deeper read commands: [Markets and Data](./markets.md), [CLOB Public Data](./clob.md)
- If you need live trading: [Production Playbook (Trading)](./production-trading.md)

