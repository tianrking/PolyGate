# Curl 手册

[English](./README.md)

为了降低认知负担，文档分为两层：

## 第 1 层：只读快速上手

- [快速上手（只读）](./quickstart-readonly.zh-CN.md)
- [市场与数据](./markets.zh-CN.md)
- [CLOB 公共查询](./clob.zh-CN.md)

## 第 2 层：交易生产实践

- [生产实践（交易）](./production-trading.zh-CN.md)
- [Approve 与 CTF](./ctf.zh-CN.md)
- [交易与鉴权命令](./trading.zh-CN.md)

每个分类文档都包含 `失败排查`，给出常见错误码与修复动作。

第 2 层私有命令还需要设置：

```bash
export API_TOKEN="replace-with-your-token"
```

## 基础地址

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

本地 Node 服务：

```bash
export BASE_URL="http://127.0.0.1:3107"
```
