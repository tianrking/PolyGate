# Approve 与 CTF 命令

[English](./ctf.md)

## 前置

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

本页中的写命令需要服务端已配置交易钱包。

## 授权状态查询

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"approve.check","params":{"address":"0x1111111111111111111111111111111111111111"}}'
```

## CTF ID 计算

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"ctf.conditionId","params":{"oracle":"0x1111111111111111111111111111111111111111","questionId":"0x2222222222222222222222222222222222222222222222222222222222222222","outcomes":2}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"ctf.collectionId","params":{"conditionId":"0xbcee96a610b7f4e61e2947f6510d1a15d4ae7c961a556b014db3527975047a1a","indexSet":"1"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"ctf.positionId","params":{"collateral":"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174","collectionId":"0x216b9f584537982f8067c123733a97eddfc439ff709254e16f0a3020ea7fc0e5"}}'
```

## 授权写命令

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"approve.set","params":{}}'
```

## CTF 写命令

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"ctf.split","params":{"conditionId":"0xbcee96a610b7f4e61e2947f6510d1a15d4ae7c961a556b014db3527975047a1a","amount":"10"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"ctf.merge","params":{"conditionId":"0xbcee96a610b7f4e61e2947f6510d1a15d4ae7c961a556b014db3527975047a1a","amount":"10"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"ctf.redeem","params":{"conditionId":"0xbcee96a610b7f4e61e2947f6510d1a15d4ae7c961a556b014db3527975047a1a"}}'
```

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"ctf.redeemNegRisk","params":{"conditionId":"0xbcee96a610b7f4e61e2947f6510d1a15d4ae7c961a556b014db3527975047a1a","amounts":"10,5"}}'
```
