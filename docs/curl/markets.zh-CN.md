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

## 失败排查

- `UNKNOWN_COMMAND`：命令名写错。修复方式：先调用 `GET /api/v1/commands` 确认精确名称。
- `VALIDATION_ERROR`：`params` 的字段名或类型不符合要求。修复方式：按命令元数据中的参数结构发送。
- 带 `gamma` 或 `data` 的 `UPSTREAM_ERROR`：上游数据接口暂时不可用或超时。修复方式：重试并检查出口网络策略。
- 带 `bridge` 的 `UPSTREAM_ERROR`：桥接接口异常或临时限流。修复方式：降低并发后重试。
