# Markets and Data Commands

[中文](./markets.zh-CN.md)

## Prerequisites

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

## Basic checks

```bash
curl "$BASE_URL/health"
curl "$BASE_URL/api/v1/commands"
```

## Gamma markets and events

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

## Tags, series, comments, profiles, sports

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

## Data API analytics

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

## Bridge read commands

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"bridge.supportedAssets","params":{}}'
```

## Troubleshooting

- `UNKNOWN_COMMAND`: command name is wrong. Fix by checking `GET /api/v1/commands`.
- `VALIDATION_ERROR`: parameter shape/type is invalid. Fix by matching the `params` schema from command metadata.
- `UPSTREAM_ERROR` with `gamma` or `data`: upstream API is unavailable or timing out. Fix by retrying and checking network egress policy.
- `UPSTREAM_ERROR` with `bridge`: bridge API failure or temporary rate limit. Fix by retrying with lower concurrency.
