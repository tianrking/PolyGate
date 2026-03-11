# 生产实践（交易）

[English](./production-trading.md)

本路径面向需要在生产环境运行鉴权交易命令的团队。

## 1）配置运行时密钥

必需：

- `POLYMARKET_PRIVATE_KEY`

推荐：

- `POLYMARKET_FUNDER_ADDRESS`
- `POLYMARKET_SIGNATURE_TYPE`（默认 `proxy`）

生产环境建议保持关闭：

- `POLYMARKET_ALLOW_PRIVATE_KEY_OVERRIDE=false`

## 2）交易前验证钱包上下文

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"wallet.info","params":{}}'
```

## 3）确认授权与 CTF 准备状态

```bash
curl -X POST "$BASE_URL/api/v1/commands/execute" \
  -H 'content-type: application/json' \
  -d '{"command":"approve.check","params":{"address":"0xYOUR_ADDRESS"}}'
```

## 4）低风险交易流程

1. `clob.createApiKey`
2. `clob.balance`
3. `clob.orders`
4. `clob.createOrder`（先小仓位）
5. `clob.cancelOrder` 或 `clob.cancelAll`

## 5）生产控制建议

- 用 Cloudflare Access/WAF/限流保护交易路由
- 公开只读与私有交易分域名或分路径
- 对 `UPSTREAM_ERROR`、`VALIDATION_ERROR`、`WALLET_REQUIRED` 建告警

## 后续阅读

- 链上授权与 CTF 命令：[Approve 与 CTF](./ctf.zh-CN.md)
- 鉴权 CLOB 执行命令：[交易与鉴权命令](./trading.zh-CN.md)

