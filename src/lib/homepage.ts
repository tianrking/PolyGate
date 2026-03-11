export type HomePageOptions = {
  runtime: "nodejs" | "cloudflare-workers";
  commandCount: number;
  baseUrl: string;
  locale: HomePageLocale;
};

export type HomePageLocale = "en" | "zh-CN";

type HomeCopy = {
  htmlLang: string;
  title: string;
  subtitle: string;
  runtimeLabel: string;
  commandLabel: string;
  basePathLabel: string;
  endpointTitle: string;
  endpointSubtitle: string;
  quickStartTitle: string;
  quickStartSubtitle: string;
  readOnlyTitle: string;
  readOnlySubtitle: string;
  tradingTitle: string;
  tradingSubtitle: string;
  groupsTitle: string;
  groupsSubtitle: string;
  docsTitle: string;
  docsSubtitle: string;
  troubleshootingTitle: string;
  troubleshootingSubtitle: string;
  footer: string;
  linkHealth: string;
  linkCommands: string;
  linkRepo: string;
  linkReadmeEn: string;
  linkReadmeZh: string;
  linkCookbook: string;
};

const HOME_COPY: Record<HomePageLocale, HomeCopy> = {
  en: {
    htmlLang: "en",
    title: "PolyGate",
    subtitle:
      "Unified Polymarket command gateway. Read market data, inspect CLOB depth, and run authenticated trading from one HTTP service.",
    runtimeLabel: "Runtime",
    commandLabel: "Commands",
    basePathLabel: "Base path",
    endpointTitle: "Endpoints",
    endpointSubtitle: "Open these directly for health and command discovery.",
    quickStartTitle: "Usage Flows",
    quickStartSubtitle: "Follow read-only first, then authenticated trading.",
    readOnlyTitle: "Read-Only Quickstart",
    readOnlySubtitle: "No wallet required.",
    tradingTitle: "Trading Quickstart",
    tradingSubtitle: "Requires runtime secrets.",
    groupsTitle: "Command Families",
    groupsSubtitle: "Most-used command namespaces.",
    docsTitle: "Documentation",
    docsSubtitle: "Bilingual docs and curl cookbook.",
    troubleshootingTitle: "Troubleshooting",
    troubleshootingSubtitle: "Common errors and immediate fixes.",
    footer:
      "Need the full live command catalog with auth flags? Check /api/v1/commands.",
    linkHealth: "Open /health",
    linkCommands: "Open /api/v1/commands",
    linkRepo: "GitHub Repo",
    linkReadmeEn: "README (EN)",
    linkReadmeZh: "README (ZH)",
    linkCookbook: "curl Cookbook",
  },
  "zh-CN": {
    htmlLang: "zh-CN",
    title: "PolyGate",
    subtitle:
      "统一的 Polymarket 命令网关。一个 HTTP 服务即可完成市场查询、CLOB 深度查看和鉴权交易执行。",
    runtimeLabel: "运行时",
    commandLabel: "命令数",
    basePathLabel: "基础路径",
    endpointTitle: "核心接口",
    endpointSubtitle: "可直接打开用于健康检查和命令发现。",
    quickStartTitle: "使用流程",
    quickStartSubtitle: "建议先只读，再接入鉴权交易。",
    readOnlyTitle: "只读快速上手",
    readOnlySubtitle: "无需钱包配置。",
    tradingTitle: "交易快速上手",
    tradingSubtitle: "需要运行时密钥。",
    groupsTitle: "命令分类",
    groupsSubtitle: "常用命名空间一览。",
    docsTitle: "文档入口",
    docsSubtitle: "中英文 README 与 curl 手册。",
    troubleshootingTitle: "故障排查",
    troubleshootingSubtitle: "高频错误与修复建议。",
    footer: "需要实时命令清单和鉴权标记，请查看 /api/v1/commands。",
    linkHealth: "打开 /health",
    linkCommands: "打开 /api/v1/commands",
    linkRepo: "GitHub 仓库",
    linkReadmeEn: "README 英文",
    linkReadmeZh: "README 中文",
    linkCookbook: "curl 手册",
  },
};

export function resolveHomeLocale(
  queryLang?: string | null,
  acceptLanguage?: string | null,
): HomePageLocale {
  const query = queryLang?.trim().toLowerCase();
  if (query && query.startsWith("zh")) {
    return "zh-CN";
  }
  if (query && query.startsWith("en")) {
    return "en";
  }

  const accept = acceptLanguage?.toLowerCase();
  if (accept?.includes("zh")) {
    return "zh-CN";
  }

  return "en";
}

function sectionTitle(title: string, subtitle: string): string {
  return `<h2>${title}</h2><p class="section-subtitle">${subtitle}</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderHomePageHtml(options: HomePageOptions): string {
  const copy = HOME_COPY[options.locale];
  const isZh = options.locale === "zh-CN";
  const runtimeLabel = options.runtime === "cloudflare-workers" ? "Cloudflare Workers" : "Node.js";
  const safeBaseUrl = escapeHtml(options.baseUrl);
  const readOnlyExample = `curl -X POST "${safeBaseUrl}/api/v1/commands/execute" \\
  -H 'content-type: application/json' \\
  -d '{"command":"markets.list","params":{"limit":10}}'`;
  const tradingExample = `curl -X POST "${safeBaseUrl}/api/v1/commands/execute" \\
  -H 'content-type: application/json' \\
  -d '{"command":"clob.createOrder","params":{
    "tokenID":"123456789","side":"BUY","price":0.42,"size":10,"orderType":"GTC"
  }}'`;
  const endpointDescHealth = isZh ? "服务健康状态" : "Service health";
  const endpointDescCommands = isZh ? "可用命令列表" : "Command list";
  const endpointDescExecute = isZh ? "执行命令请求" : "Execute command";
  const tableMethod = isZh ? "方法" : "Method";
  const tablePath = isZh ? "路径" : "Path";
  const tableDesc = isZh ? "说明" : "Description";
  const authHint = isZh
    ? "鉴权命令需要配置 `POLYMARKET_PRIVATE_KEY`"
    : "Auth-required commands need `POLYMARKET_PRIVATE_KEY`";
  const sizeHint = isZh
    ? "生产前先用小仓位做下单验证。"
    : "Use small size test orders before production scale.";
  const troubleshootItems = isZh
    ? [
        "<code>UNKNOWN_COMMAND</code>：从 <code>/api/v1/commands</code> 复制正确命令名",
        "<code>VALIDATION_ERROR</code>：<code>params</code> 字段名或类型不匹配",
        "<code>WALLET_REQUIRED</code>：鉴权命令缺少运行时钱包密钥",
        "<code>UPSTREAM_ERROR</code>：上游接口超时或失败，先重试并降低并发",
        "生产建议：对交易路径启用 Access、WAF 和严格限流",
      ]
    : [
        "<code>UNKNOWN_COMMAND</code>: verify command name from <code>/api/v1/commands</code>",
        "<code>VALIDATION_ERROR</code>: payload shape/type mismatch in <code>params</code>",
        "<code>WALLET_REQUIRED</code>: missing runtime wallet secrets for auth-required commands",
        "<code>UPSTREAM_ERROR</code>: retry and reduce burst concurrency to CLOB/Gamma/Data upstreams",
        "Production: protect trading endpoints with Access, WAF, and strict rate limits",
      ];
  const baseUrlTitle = isZh ? "基础地址" : "Base URL";
  const baseUrlSubtitle = isZh
    ? "下方示例命令默认使用这个地址。"
    : "Used by examples on this page.";
  const groupDataLine = isZh
    ? "<code>data.*</code> 地址级分析、持仓、排行榜"
    : "<code>data.*</code> analytics and address-level insights";
  const groupClobLine = isZh
    ? "<code>clob.*</code> 公共行情与私有交易执行"
    : "<code>clob.*</code> public market data and private execution";
  const groupCtfLine = isZh
    ? "<code>approve.*</code> 与 <code>ctf.*</code> 链上操作"
    : "<code>approve.*</code> and <code>ctf.*</code> on-chain operations";

  return `<!doctype html>
<html lang="${copy.htmlLang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${copy.title}</title>
    <meta name="description" content="PolyGate turns Polymarket capabilities into a deployable HTTP command service." />
    <style>
      :root {
        --bg: #f6f8fb;
        --card: #ffffff;
        --text: #102036;
        --muted: #4b5a71;
        --line: #d6dce8;
        --accent: #0f6fff;
        --accent-soft: #e8f1ff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 10% 0%, #dce9ff 0, transparent 38%),
          radial-gradient(circle at 100% 20%, #e2f7ee 0, transparent 32%),
          var(--bg);
      }
      .wrap { max-width: 1100px; margin: 0 auto; padding: 28px 18px 48px; }
      .hero {
        background: linear-gradient(140deg, #0f6fff 0%, #1f8df5 55%, #11b0d8 100%);
        color: #fff;
        border-radius: 18px;
        padding: 28px;
        box-shadow: 0 12px 34px rgba(18, 49, 96, 0.2);
      }
      .hero h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.1; }
      .hero p { margin: 0; font-size: 16px; opacity: 0.96; max-width: 860px; }
      .badges { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; }
      .badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.35);
        border-radius: 999px;
        padding: 6px 11px;
        font-size: 12px;
        font-weight: 600;
      }
      .language-switch {
        margin-top: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .lang-chip {
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.45);
        border-radius: 999px;
        padding: 6px 11px;
        font-weight: 600;
        font-size: 13px;
      }
      .lang-chip.active {
        background: rgba(255, 255, 255, 0.24);
      }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 16px;
      }
      h2 { margin: 2px 0 4px; font-size: 20px; }
      .section-subtitle { margin: 0 0 14px; color: var(--muted); font-size: 14px; }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 6px 0; color: #20344f; }
      code {
        background: #f1f4fa;
        border: 1px solid #e1e7f3;
        border-radius: 6px;
        padding: 2px 6px;
        font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
      }
      pre {
        margin: 0;
        overflow: auto;
        background: #0f1a2b;
        color: #e2ecff;
        border-radius: 12px;
        padding: 14px;
        border: 1px solid #1d2a41;
        font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        line-height: 1.5;
      }
      a { color: var(--accent); text-decoration: none; }
      a:hover { text-decoration: underline; }
      .links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      .link-chip {
        background: var(--accent-soft);
        border: 1px solid #c9ddff;
        border-radius: 999px;
        color: #124db2;
        padding: 7px 12px;
        font-weight: 600;
        font-size: 13px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      th, td {
        border-bottom: 1px solid #e8edf6;
        text-align: left;
        padding: 8px 6px;
      }
      th {
        color: #2f4463;
      }
      .footer { margin-top: 18px; color: var(--muted); font-size: 13px; }
      @media (max-width: 850px) {
        .grid { grid-template-columns: 1fr; }
        .hero h1 { font-size: 28px; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="hero">
        <h1>${copy.title}</h1>
        <p>${copy.subtitle}</p>
        <div class="badges">
          <span class="badge">${copy.runtimeLabel}: ${runtimeLabel}</span>
          <span class="badge">${copy.commandLabel}: ${options.commandCount}</span>
          <span class="badge">${copy.basePathLabel}: /api/v1</span>
          <span class="badge">Base URL: ${safeBaseUrl}</span>
        </div>
        <div class="language-switch">
          <a class="lang-chip ${options.locale === "en" ? "active" : ""}" href="/?lang=en">English</a>
          <a class="lang-chip ${options.locale === "zh-CN" ? "active" : ""}" href="/?lang=zh-CN">中文</a>
        </div>
      </section>

      <div class="grid">
        <section class="card">
          ${sectionTitle(copy.endpointTitle, copy.endpointSubtitle)}
          <table>
            <thead>
              <tr><th>${tableMethod}</th><th>${tablePath}</th><th>${tableDesc}</th></tr>
            </thead>
            <tbody>
              <tr><td>GET</td><td><code>/health</code></td><td>${endpointDescHealth}</td></tr>
              <tr><td>GET</td><td><code>/api/v1/commands</code></td><td>${endpointDescCommands}</td></tr>
              <tr><td>POST</td><td><code>/api/v1/commands/execute</code></td><td>${endpointDescExecute}</td></tr>
            </tbody>
          </table>
          <div class="links">
            <a class="link-chip" href="/health">${copy.linkHealth}</a>
            <a class="link-chip" href="/api/v1/commands">${copy.linkCommands}</a>
          </div>
        </section>

        <section class="card">
          ${sectionTitle(copy.quickStartTitle, copy.quickStartSubtitle)}
          <ul>
            <li>${copy.readOnlyTitle}: <code>markets.list</code> -> <code>clob.book</code> -> <code>data.positions</code></li>
            <li>${copy.tradingTitle}: <code>wallet.info</code> -> <code>approve.check</code> -> <code>clob.createOrder</code></li>
            <li>${authHint}</li>
            <li>${sizeHint}</li>
          </ul>
        </section>

        <section class="card">
          ${sectionTitle(copy.readOnlyTitle, copy.readOnlySubtitle)}
          <pre>${readOnlyExample}</pre>
        </section>

        <section class="card">
          ${sectionTitle(copy.tradingTitle, copy.tradingSubtitle)}
          <pre>${tradingExample}</pre>
        </section>

        <section class="card">
          ${sectionTitle(copy.groupsTitle, copy.groupsSubtitle)}
          <ul>
            <li><code>markets.*</code> / <code>events.*</code> / <code>tags.*</code> / <code>series.*</code></li>
            <li>${groupDataLine}</li>
            <li>${groupClobLine}</li>
            <li>${groupCtfLine}</li>
          </ul>
        </section>

        <section class="card">
          ${sectionTitle(copy.docsTitle, copy.docsSubtitle)}
          <div class="links">
            <a class="link-chip" href="https://github.com/tianrking/PolyGate">${copy.linkRepo}</a>
            <a class="link-chip" href="https://github.com/tianrking/PolyGate/blob/main/README.md">${copy.linkReadmeEn}</a>
            <a class="link-chip" href="https://github.com/tianrking/PolyGate/blob/main/README.zh-CN.md">${copy.linkReadmeZh}</a>
            <a class="link-chip" href="https://github.com/tianrking/PolyGate/tree/main/docs/curl">${copy.linkCookbook}</a>
          </div>
        </section>

        <section class="card">
          ${sectionTitle(copy.troubleshootingTitle, copy.troubleshootingSubtitle)}
          <ul>
            <li>${troubleshootItems[0]}</li>
            <li>${troubleshootItems[1]}</li>
            <li>${troubleshootItems[2]}</li>
            <li>${troubleshootItems[3]}</li>
            <li>${troubleshootItems[4]}</li>
          </ul>
        </section>

        <section class="card">
          ${sectionTitle(baseUrlTitle, baseUrlSubtitle)}
          <pre>export BASE_URL="${safeBaseUrl}"</pre>
          <div class="links">
            <a class="link-chip" href="/?lang=en">/?lang=en</a>
            <a class="link-chip" href="/?lang=zh-CN">/?lang=zh-CN</a>
          </div>
        </section>
      </div>

      <p class="footer">
        ${copy.footer}
      </p>
    </div>
  </body>
</html>`;
}
