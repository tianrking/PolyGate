# 快速上手（只读）

[English](./quickstart-readonly.md)

本路径面向只需要市场查询的人群，不需要钱包配置。

## 1）设置基础地址

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

## 2）服务检查

```bash
curl "$BASE_URL/health"
curl "$BASE_URL/api/v1/commands"
```

## 3）获取市场与事件快照

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

## 4）获取 CLOB 公共行情与深度

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

## 后续阅读

- 进阶只读命令：[市场与数据](./markets.zh-CN.md)、[CLOB 公共查询](./clob.zh-CN.md)
- 若需要交易功能：[生产实践（交易）](./production-trading.zh-CN.md)

