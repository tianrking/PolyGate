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
  linkManifest: string;
  linkSampleCommand: string;
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
    linkManifest: "Open /api/v1/manifest",
    linkSampleCommand: "Open /api/v1/commands/markets.list",
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
    linkManifest: "打开 /api/v1/manifest",
    linkSampleCommand: "打开 /api/v1/commands/markets.list",
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

function toInlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("</script>", "<\\/script>");
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
  const endpointDescDetail = isZh ? "单命令详情与示例" : "Single-command details and examples";
  const endpointDescManifest = isZh ? "完整命令元数据清单" : "Full command metadata catalog";
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
  const consoleTitle = isZh ? "Web 控制台" : "Web Console";
  const consoleSubtitle = isZh
    ? "直接在页面选择命令并执行，无需手写 curl。"
    : "Run commands directly on the page without writing curl.";
  const consoleConfig = {
    locale: options.locale,
    labels: {
      command: isZh ? "命令" : "Command",
      params: isZh ? "参数 JSON（可编辑）" : "Params JSON (editable)",
      execute: isZh ? "执行命令" : "Execute Command",
      reset: isZh ? "恢复模板" : "Reset Template",
      result: isZh ? "执行结果" : "Execution Result",
      curl: isZh ? "参考 curl" : "Reference curl",
      authTag: isZh ? "[鉴权]" : "[auth]",
      disabledTag: isZh ? "[禁用]" : "[disabled]",
      statusReady: isZh ? "就绪" : "Ready",
      statusLoadingCommands: isZh ? "加载命令列表中..." : "Loading command list...",
      statusLoadingDetail: isZh ? "加载命令模板中..." : "Loading command template...",
      statusExecuting: isZh ? "请求执行中..." : "Executing request...",
      statusDone: isZh ? "请求完成" : "Request completed",
      statusError: isZh ? "请求失败" : "Request failed",
      statusDisabled: isZh ? "当前命令被策略禁用" : "This command is disabled by policy",
      invalidJson: isZh ? "参数 JSON 解析失败，请修正后重试。" : "Invalid JSON parameters. Fix the payload and retry.",
      unknownError: isZh ? "未知错误" : "Unknown error",
      selectPlaceholder: isZh ? "请选择命令" : "Select command",
      noCommand: isZh ? "暂无可用命令" : "No commands available",
      commandLoadFailed: isZh ? "命令加载失败" : "Command loading failed",
    },
  };
  const inlineConsoleConfig = toInlineJson(consoleConfig);

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
      .card.wide {
        grid-column: 1 / -1;
      }
      h2 { margin: 2px 0 4px; font-size: 20px; }
      .section-subtitle { margin: 0 0 14px; color: var(--muted); font-size: 14px; }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 6px 0; color: #20344f; }
      label {
        display: inline-block;
        margin: 8px 0 6px;
        font-size: 13px;
        font-weight: 600;
        color: #2c3f5f;
      }
      .console-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .console-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .console-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid #cde1ff;
        background: #eef5ff;
        color: #1d58bf;
      }
      .console-status.error {
        background: #fff0f2;
        border-color: #ffc7d1;
        color: #a1253a;
      }
      .console-status.muted {
        background: #f2f5fa;
        border-color: #dde3ee;
        color: #4f627f;
      }
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
      textarea {
        width: 100%;
        min-height: 170px;
        resize: vertical;
        border-radius: 10px;
        border: 1px solid #cfd9ea;
        padding: 10px;
        font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        line-height: 1.45;
      }
      select {
        width: 100%;
        border-radius: 10px;
        border: 1px solid #cfd9ea;
        padding: 9px 10px;
        font-size: 14px;
        background: #fff;
      }
      button {
        appearance: none;
        border: 1px solid #c8d9fb;
        background: #eff5ff;
        color: #164fae;
        font-weight: 700;
        border-radius: 9px;
        padding: 8px 12px;
        font-size: 13px;
        cursor: pointer;
      }
      button:hover {
        background: #e6f0ff;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
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
        .console-grid { grid-template-columns: 1fr; }
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
              <tr><td>GET</td><td><code>/api/v1/commands/:command</code></td><td>${endpointDescDetail}</td></tr>
              <tr><td>GET</td><td><code>/api/v1/manifest</code></td><td>${endpointDescManifest}</td></tr>
              <tr><td>POST</td><td><code>/api/v1/commands/execute</code></td><td>${endpointDescExecute}</td></tr>
            </tbody>
          </table>
          <div class="links">
            <a class="link-chip" href="/health">${copy.linkHealth}</a>
            <a class="link-chip" href="/api/v1/commands">${copy.linkCommands}</a>
            <a class="link-chip" href="/api/v1/commands/markets.list">${copy.linkSampleCommand}</a>
            <a class="link-chip" href="/api/v1/manifest">${copy.linkManifest}</a>
          </div>
        </section>

        <section class="card wide">
          ${sectionTitle(consoleTitle, consoleSubtitle)}
          <div class="console-status muted" id="cmd-status"></div>
          <label for="cmd-select"></label>
          <select id="cmd-select"></select>
          <div class="console-grid">
            <div>
              <label for="cmd-params"></label>
              <textarea id="cmd-params" spellcheck="false"></textarea>
            </div>
            <div>
              <label for="cmd-result"></label>
              <pre id="cmd-result"></pre>
            </div>
          </div>
          <div class="console-actions">
            <button id="cmd-run" type="button"></button>
            <button id="cmd-reset" type="button"></button>
          </div>
          <label for="cmd-curl"></label>
          <pre id="cmd-curl"></pre>
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
    <script>
      const consoleConfig = ${inlineConsoleConfig};
      const labels = consoleConfig.labels;
      const commandSelect = document.getElementById("cmd-select");
      const paramsInput = document.getElementById("cmd-params");
      const runButton = document.getElementById("cmd-run");
      const resetButton = document.getElementById("cmd-reset");
      const resultBox = document.getElementById("cmd-result");
      const curlBox = document.getElementById("cmd-curl");
      const statusBox = document.getElementById("cmd-status");
      const selectLabel = document.querySelector('label[for="cmd-select"]');
      const paramsLabel = document.querySelector('label[for="cmd-params"]');
      const resultLabel = document.querySelector('label[for="cmd-result"]');
      const curlLabel = document.querySelector('label[for="cmd-curl"]');

      if (selectLabel) selectLabel.textContent = labels.command;
      if (paramsLabel) paramsLabel.textContent = labels.params;
      if (resultLabel) resultLabel.textContent = labels.result;
      if (curlLabel) curlLabel.textContent = labels.curl;
      if (runButton) runButton.textContent = labels.execute;
      if (resetButton) resetButton.textContent = labels.reset;

      let activeTemplate = "{}";
      let activeCurl = "";

      function setStatus(text, mode) {
        if (!statusBox) return;
        statusBox.textContent = text;
        statusBox.classList.remove("error", "muted");
        if (mode === "error") statusBox.classList.add("error");
        if (mode === "muted") statusBox.classList.add("muted");
      }

      function pretty(value) {
        return JSON.stringify(value, null, 2);
      }

      async function loadDetails(commandName) {
        setStatus(labels.statusLoadingDetail, "muted");
        const response = await fetch("/api/v1/commands/" + encodeURIComponent(commandName));
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload?.error?.message || labels.commandLoadFailed);
        }
        activeTemplate = pretty(payload.data.paramsExample || {});
        activeCurl = payload.data.curlExample || "";
        if (paramsInput) paramsInput.value = activeTemplate;
        if (curlBox) curlBox.textContent = activeCurl;
        const isEnabled = payload?.data?.enabled !== false;
        if (runButton) runButton.disabled = !isEnabled;
        setStatus(isEnabled ? labels.statusReady : labels.statusDisabled, isEnabled ? "muted" : "error");
      }

      async function loadCommands() {
        setStatus(labels.statusLoadingCommands, "muted");
        const response = await fetch("/api/v1/commands");
        const payload = await response.json();
        if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
          throw new Error(labels.commandLoadFailed);
        }

        const items = payload.data;
        if (!commandSelect) return;
        commandSelect.innerHTML = "";

        if (items.length === 0) {
          const option = document.createElement("option");
          option.value = "";
          option.textContent = labels.noCommand;
          commandSelect.appendChild(option);
          setStatus(labels.noCommand, "error");
          return;
        }

        items.sort((a, b) => String(a.command).localeCompare(String(b.command)));
        for (const item of items) {
          const option = document.createElement("option");
          option.value = item.command;
          const flags = [];
          if (item.authRequired) flags.push(labels.authTag);
          if (item.enabled === false) flags.push(labels.disabledTag);
          option.textContent = item.command + (flags.length ? " " + flags.join(" ") : "");
          commandSelect.appendChild(option);
        }

        const params = new URLSearchParams(window.location.search);
        const queryCommand = params.get("command");
        const hasQuery = items.some((item) => item.command === queryCommand);
        const firstCommand = hasQuery ? queryCommand : items[0].command;

        commandSelect.value = firstCommand;
        await loadDetails(firstCommand);
      }

      async function runCommand() {
        if (!commandSelect || !paramsInput) return;
        setStatus(labels.statusExecuting, "muted");

        let params;
        try {
          params = JSON.parse(paramsInput.value || "{}");
        } catch (_error) {
          if (resultBox) resultBox.textContent = labels.invalidJson;
          setStatus(labels.statusError, "error");
          return;
        }

        const response = await fetch("/api/v1/commands/execute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            command: commandSelect.value,
            params,
          }),
        });
        const payload = await response.json().catch(() => ({
          success: false,
          error: { message: labels.unknownError },
        }));

        if (resultBox) resultBox.textContent = pretty(payload);
        setStatus(response.ok ? labels.statusDone : labels.statusError, response.ok ? "muted" : "error");
      }

      if (commandSelect) {
        commandSelect.addEventListener("change", async () => {
          if (!commandSelect.value) return;
          try {
            await loadDetails(commandSelect.value);
          } catch (error) {
            if (resultBox) resultBox.textContent = String(error);
            setStatus(labels.statusError, "error");
          }
        });
      }

      if (runButton) {
        runButton.addEventListener("click", async () => {
          try {
            await runCommand();
          } catch (error) {
            if (resultBox) resultBox.textContent = String(error);
            setStatus(labels.statusError, "error");
          }
        });
      }

      if (resetButton) {
        resetButton.addEventListener("click", () => {
          if (paramsInput) paramsInput.value = activeTemplate;
          if (curlBox) curlBox.textContent = activeCurl;
          setStatus(labels.statusReady, "muted");
        });
      }

      loadCommands().catch((error) => {
        if (resultBox) resultBox.textContent = String(error);
        setStatus(labels.commandLoadFailed, "error");
      });
    </script>
  </body>
</html>`;
}
