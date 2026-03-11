import { Hono } from "hono";
import { cors } from "hono/cors";

import { buildCommandRegistry, listCommands } from "./commands.js";
import { workerConfig, type WorkerBindings } from "./config/worker.js";
import { getCommandDetails, listCommandDetails } from "./lib/command-catalog.js";
import { AppError, normalizeError } from "./lib/errors.js";
import { renderHomePageHtml, resolveHomeLocale } from "./lib/homepage.js";
import { PolymarketService } from "./services/polymarket-service.js";
import { executeCommandPayload } from "./transport/command-execution.js";

type RuntimeBundle = {
  service: PolymarketService;
  registry: ReturnType<typeof buildCommandRegistry>;
};

const runtimeCache = new WeakMap<object, RuntimeBundle>();

function getRuntime(env: WorkerBindings): RuntimeBundle {
  const cached = runtimeCache.get(env as object);

  if (cached) {
    return cached;
  }

  const service = new PolymarketService(workerConfig(env));
  const registry = buildCommandRegistry(service);
  const bundle = { service, registry };

  runtimeCache.set(env as object, bundle);
  return bundle;
}

const app = new Hono<{ Bindings: WorkerBindings }>();

app.use("*", async (c, next) => {
  const config = workerConfig(c.env);
  const origin = config.APP_CORS_ORIGIN;

  return cors({
    origin: origin === "*" ? "*" : origin.split(",").map((value) => value.trim()),
    allowHeaders: ["Content-Type", "x-polymarket-private-key", "x-polymarket-signature-type", "x-polymarket-funder-address"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })(c, next);
});

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "PolyGate",
    runtime: "cloudflare-workers",
  }),
);

app.get("/", (c) => {
  const { registry } = getRuntime(c.env);
  const commandList = listCommands(registry);
  const requestUrl = new URL(c.req.url);
  const locale = resolveHomeLocale(
    requestUrl.searchParams.get("lang"),
    c.req.header("accept-language"),
  );
  const html = renderHomePageHtml({
    runtime: "cloudflare-workers",
    commandCount: commandList.length,
    locale,
    baseUrl: requestUrl.origin,
  });

  return c.html(html);
});

app.get("/api/v1/commands", (c) => {
  const { registry } = getRuntime(c.env);
  const commandList = listCommands(registry);

  return c.json({
    success: true,
    data: commandList,
  });
});

app.get("/api/v1/commands/:command", (c) => {
  const { registry } = getRuntime(c.env);
  const command = c.req.param("command");
  const baseUrl = new URL(c.req.url).origin;
  const details = getCommandDetails(registry, command, baseUrl);

  if (!details) {
    throw new AppError(`Unsupported command: ${command}`, {
      statusCode: 404,
      code: "UNKNOWN_COMMAND",
    });
  }

  return c.json({
    success: true,
    data: details,
  });
});

app.get("/api/v1/manifest", (c) => {
  const { registry } = getRuntime(c.env);
  const baseUrl = new URL(c.req.url).origin;

  return c.json({
    success: true,
    data: {
      service: "PolyGate",
      version: "0.1.0",
      generatedAt: new Date().toISOString(),
      endpoints: {
        health: "/health",
        listCommands: "/api/v1/commands",
        commandDetails: "/api/v1/commands/:command",
        execute: "/api/v1/commands/execute",
      },
      commands: listCommandDetails(registry, baseUrl),
    },
  });
});

app.post("/api/v1/commands/execute", async (c) => {
  const { registry } = getRuntime(c.env);
  const payload = await c.req.json().catch(() => ({}));
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  const { command, data } = await executeCommandPayload(registry, payload, headers);

  return c.json({
    success: true,
    command,
    data,
  });
});

app.onError((error, c) => {
  const appError = normalizeError(error);

  return c.json(
    {
      success: false,
      error: {
        code: appError.code,
        message: appError.expose ? appError.message : "Internal server error",
        details: appError.expose ? appError.details : undefined,
      },
    },
    appError.statusCode as 200,
  );
});

export default app;
