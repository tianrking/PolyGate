export type HomePageOptions = {
  runtime: "nodejs" | "cloudflare-workers";
  commandCount: number;
};

function sectionTitle(title: string, subtitle: string): string {
  return `<h2>${title}</h2><p class="section-subtitle">${subtitle}</p>`;
}

export function renderHomePageHtml(options: HomePageOptions): string {
  const runtimeLabel = options.runtime === "cloudflare-workers" ? "Cloudflare Workers" : "Node.js";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PolyGate</title>
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
      .hero h1 { margin: 0 0 8px; font-size: 32px; line-height: 1.1; }
      .hero p { margin: 0; font-size: 16px; opacity: 0.96; }
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
        <h1>PolyGate</h1>
        <p>Polymarket unified command gateway. Query data, inspect CLOB, and execute authenticated trading through one HTTP interface.</p>
        <div class="badges">
          <span class="badge">Runtime: ${runtimeLabel}</span>
          <span class="badge">Commands: ${options.commandCount}</span>
          <span class="badge">Base path: /api/v1</span>
        </div>
      </section>

      <div class="grid">
        <section class="card">
          ${sectionTitle("Quick Start", "Read-only calls work without wallet setup.")}
          <ul>
            <li>Health: <code>GET /health</code></li>
            <li>List commands: <code>GET /api/v1/commands</code></li>
            <li>Execute command: <code>POST /api/v1/commands/execute</code></li>
          </ul>
          <div class="links">
            <a class="link-chip" href="/health">Open /health</a>
            <a class="link-chip" href="/api/v1/commands">Open /api/v1/commands</a>
          </div>
        </section>

        <section class="card">
          ${sectionTitle("Command Groups", "Most-used areas in one place.")}
          <ul>
            <li><code>markets.*</code>, <code>events.*</code>, <code>tags.*</code>, <code>series.*</code></li>
            <li><code>data.*</code> analytics, positions, leaderboard</li>
            <li><code>clob.*</code> public market data and authenticated trading</li>
            <li><code>approve.*</code> and <code>ctf.*</code> chain operations</li>
          </ul>
        </section>

        <section class="card">
          ${sectionTitle("Read-Only Example", "Fetch the latest markets list.")}
          <pre>curl -X POST "$BASE_URL/api/v1/commands/execute" \\
  -H 'content-type: application/json' \\
  -d '{"command":"markets.list","params":{"limit":10}}'</pre>
        </section>

        <section class="card">
          ${sectionTitle("Trading Example", "Requires wallet secrets in runtime env.")}
          <pre>curl -X POST "$BASE_URL/api/v1/commands/execute" \\
  -H 'content-type: application/json' \\
  -d '{"command":"clob.createOrder","params":{
    "tokenID":"123456789","side":"BUY","price":0.42,"size":10,"orderType":"GTC"
  }}'</pre>
        </section>

        <section class="card">
          ${sectionTitle("Deployment Notes", "Designed for both Node and Workers.")}
          <ul>
            <li>Use Workers for lightweight global API access.</li>
            <li>Protect trading routes with Access/WAF/rate policies.</li>
            <li>Store keys as runtime secrets, never in source files.</li>
          </ul>
        </section>

        <section class="card">
          ${sectionTitle("Documentation", "Bilingual docs and curl cookbook.")}
          <div class="links">
            <a class="link-chip" href="https://github.com/tianrking/PolyGate">GitHub Repo</a>
            <a class="link-chip" href="https://github.com/tianrking/PolyGate/blob/main/README.md">README (EN)</a>
            <a class="link-chip" href="https://github.com/tianrking/PolyGate/blob/main/README.zh-CN.md">README (ZH)</a>
            <a class="link-chip" href="https://github.com/tianrking/PolyGate/tree/main/docs/curl">curl Cookbook</a>
          </div>
        </section>
      </div>

      <p class="footer">
        Need the full command list and auth requirements? Open <code>/api/v1/commands</code>.
      </p>
    </div>
  </body>
</html>`;
}
