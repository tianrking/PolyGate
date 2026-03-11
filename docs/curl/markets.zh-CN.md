# 市场与数据命令

[English](./markets.md)

## 前置

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

## 基础检查

```bash
curl "$BASE_URL/health"
curl "$BASE_URL/api/v1/commands"
```

## Gamma 市场与事件

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"markets.list","params":{"limit":10}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"markets.get","params":{"id":"will-bitcoin-be-above-100k-on-december-31-2026"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"events.list","params":{"limit":10}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"markets.search","params":{"query":"election","limit":5}}'
```

## 标签、系列、评论、体育

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"tags.list","params":{"limit":10}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"series.list","params":{"limit":10}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"sports.list","params":{}}'
```

## Data API 分析

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"data.positions","params":{"address":"0x1111111111111111111111111111111111111111","limit":5}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"data.trades","params":{"address":"0x1111111111111111111111111111111111111111","limit":5}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"data.leaderboard","params":{"period":"week","orderBy":"vol","limit":10}}'
```

## Bridge 只读命令

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"bridge.supportedAssets","params":{}}'
```
