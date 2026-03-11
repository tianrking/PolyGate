# Production Playbook (Trading)

[中文](./production-trading.zh-CN.md)

This path is for teams deploying authenticated trading in production.

## 1) Configure runtime secrets

Required:

- `POLYMARKET_PRIVATE_KEY`
- `POLYGATE_API_TOKENS` (comma-separated strong tokens)

Recommended:

- `POLYMARKET_FUNDER_ADDRESS`
- `POLYMARKET_SIGNATURE_TYPE` (`proxy` by default)

Keep disabled in production unless strictly needed:

- `POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE=false`

Client examples below assume:

```bash
export API_TOKEN="replace-with-your-token"
```

## 2) Verify wallet context before trading

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"wallet.info","params":{}}'
```

## 3) Confirm allowances and CTF readiness

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -H "x-polygate-token: $API_TOKEN" \
  -d '{"command":"approve.check","params":{"address":"0xYOUR_ADDRESS"}}'
```

## 4) Start with low-risk command flow

1. `clob.createApiKey`
2. `clob.balance`
3. `clob.orders`
4. `clob.createOrder` (small size)
5. `clob.cancelOrder` or `clob.cancelAll`

## 5) Add production controls

- Restrict route access with Cloudflare Access/WAF/rate policies
- Separate public read endpoints from private trading endpoints
- Alert on `UPSTREAM_ERROR`, `VALIDATION_ERROR`, `WALLET_REQUIRED`, and `API_TOKEN_INVALID`

## Next docs

- On-chain approvals and CTF commands: [Approve and CTF](./ctf.md)
- Authenticated CLOB execution: [Trading and Authenticated CLOB](./trading.md)
