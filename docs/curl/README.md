# Curl Cookbook

[中文说明 / Chinese](./README.zh-CN.md)

This directory provides command examples in two layers to reduce onboarding complexity.

## Layer 1: Read-Only Quickstart

- [Quickstart (Read-Only)](./quickstart-readonly.md)
- [Markets and Data](./markets.md)
- [CLOB Public Data](./clob.md)

## Layer 2: Trading Production Playbook

- [Production Playbook (Trading)](./production-trading.md)
- [Approve and CTF](./ctf.md)
- [Trading and Authenticated CLOB](./trading.md)

Each category file includes a `Troubleshooting` section with common error codes and concrete fixes.

For Layer 2 private commands, also set:

```bash
export API_TOKEN="replace-with-your-token"
```

## Base URL

```bash
export BASE_URL="https://polygate.bkgr.workers.dev"
```

Use local Node service:

```bash
export BASE_URL="http://127.0.0.1:3107"
```
