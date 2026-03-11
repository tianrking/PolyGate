import { Hono } from "hono";
import { cors } from "hono/cors";

import { buildCommandRegistry, listCommands } from "./commands.js";
import { workerConfig, type WorkerBindings } from "./config/worker.js";
import { getCommandDetails, listCommandDetails } from "./lib/command-catalog.js";
import { buildCommandPolicy, isCommandAuthRequired, isCommandDisabled } from "./lib/command-policy.js";
import { AppError, normalizeError } from "./lib/errors.js";
import {
  createCommandExecutionEvent,
  dispatchWebhookEvent,
  extractCommandFromPayload,
  formatSseComment,
  formatSseEvent,
  MemoryEventHub,
  type CommandExecutionEvent,
} from "./lib/events.js";
import { renderHomePageHtml, resolveHomeLocale } from "./lib/homepage.js";
import { PolymarketService } from "./services/polymarket-service.js";
import { executeCommandPayload } from "./transport/command-execution.js";
import type { RuntimeConfig } from "./config/schema.js";
import type { CommandPolicy } from "./lib/command-policy.js";

type RuntimeBundle = {
  config: RuntimeConfig;
  policy: CommandPolicy;
  service: PolymarketService;
  registry: ReturnType<typeof buildCommandRegistry>;
  commandList: Array<{
    command: string;
    description: string;
    authRequired: boolean;
    enabled: boolean;
  }>;
  enabledCommandCount: number;
};

const runtimeCache = new WeakMap<object, RuntimeBundle>();
const workerEventHub = new MemoryEventHub<CommandExecutionEvent>();

function getRuntime(env: WorkerBindings): RuntimeBundle {
  const cached = runtimeCache.get(env as object);

  if (cached) {
    return cached;
  }

  const config = workerConfig(env);
  const policy = buildCommandPolicy(config);
  const service = new PolymarketService(config);
  const registry = buildCommandRegistry(service);
  const commandList = listCommands(registry).map((entry) => ({
    ...entry,
    authRequired: isCommandAuthRequired(policy, entry.command, entry.authRequired),
    enabled: !isCommandDisabled(policy, entry.command),
  }));
  const enabledCommandCount = commandList.filter((entry) => entry.enabled).length;
  const bundle = {
    config,
    policy,
    service,
    registry,
    commandList,
    enabledCommandCount,
  };

  runtimeCache.set(env as object, bundle);
  return bundle;
}

const app = new Hono<{ Bindings: WorkerBindings }>();

app.use("*", async (c, next) => {
  const config = workerConfig(c.env);
  const origin = config.APP_CORS_ORIGIN;
  const allowHeaders = [
    "Content-Type",
    "authorization",
    "x-polymarket-private-key",
    "x-polymarket-signature-type",
    "x-polymarket-funder-address",
    config.POLYGATE_API_TOKEN_HEADER,
  ];

  return cors({
    origin: origin === "*" ? "*" : origin.split(",").map((value) => value.trim()),
    allowHeaders,
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
  const { enabledCommandCount } = getRuntime(c.env);
  const requestUrl = new URL(c.req.url);
  const locale = resolveHomeLocale(
    requestUrl.searchParams.get("lang"),
    c.req.header("accept-language"),
  );
  const html = renderHomePageHtml({
    runtime: "cloudflare-workers",
    commandCount: enabledCommandCount,
    locale,
    baseUrl: requestUrl.origin,
  });

  return c.html(html);
});

app.get("/api/v1/commands", (c) => {
  const { commandList } = getRuntime(c.env);

  return c.json({
    success: true,
    data: commandList,
  });
});

app.get("/api/v1/commands/:command", (c) => {
  const { registry, policy } = getRuntime(c.env);
  const command = c.req.param("command");
  const baseUrl = new URL(c.req.url).origin;
  const details = getCommandDetails(
    registry,
    command,
    baseUrl,
    {
      resolveAuthRequired: (name, defaultAuthRequired) =>
        isCommandAuthRequired(policy, name, defaultAuthRequired),
      resolveEnabled: (name) => !isCommandDisabled(policy, name),
    },
  );

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
  const { registry, policy } = getRuntime(c.env);
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
        streamEvents: "/api/v1/events/stream",
        execute: "/api/v1/commands/execute",
      },
      commands: listCommandDetails(registry, baseUrl, {
        resolveAuthRequired: (name, defaultAuthRequired) =>
          isCommandAuthRequired(policy, name, defaultAuthRequired),
        resolveEnabled: (name) => !isCommandDisabled(policy, name),
      }),
    },
  });
});

app.get("/api/v1/events/stream", (c) => {
  const { config } = getRuntime(c.env);
  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const push = (chunk: string) => {
    void writer.write(encoder.encode(chunk)).catch(() => {
      // Connection closed by client.
    });
  };

  push(formatSseComment("connected"));
  const unsubscribe = workerEventHub.subscribe((event) => {
    push(formatSseEvent("command.execution", event, event.id));
  });
  const heartbeat = setInterval(() => {
    push(formatSseComment("heartbeat"));
  }, config.POLYGATE_SSE_HEARTBEAT_MS);

  const close = () => {
    clearInterval(heartbeat);
    unsubscribe();
    void writer.close().catch(() => {
      // Ignore close errors when already closed.
    });
  };

  c.req.raw.signal.addEventListener("abort", close, { once: true });

  return new Response(stream.readable, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
});

app.post("/api/v1/commands/execute", async (c) => {
  const { registry, config, policy } = getRuntime(c.env);
  const payload = await c.req.json().catch(() => ({}));
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  const startedAt = Date.now();
  const requestedCommand = extractCommandFromPayload(payload);

  try {
    const { command, data } = await executeCommandPayload(
      registry,
      payload,
      headers,
      {
        config,
        isCommandDisabled: (name) => isCommandDisabled(policy, name),
        isAuthRequired: (name, defaultAuthRequired) =>
          isCommandAuthRequired(policy, name, defaultAuthRequired),
      },
    );

    const event = createCommandExecutionEvent({
      command,
      success: true,
      durationMs: Date.now() - startedAt,
      statusCode: 200,
    });
    workerEventHub.publish(event);
    c.executionCtx.waitUntil(
      dispatchWebhookEvent(config, event).catch(() => {
        // Best-effort delivery for webhook notifications.
      }),
    );

    return c.json({
      success: true,
      command,
      data,
    });
  } catch (error) {
    const appError = normalizeError(error);
    const event = createCommandExecutionEvent({
      command: requestedCommand,
      success: false,
      durationMs: Date.now() - startedAt,
      statusCode: appError.statusCode,
      errorCode: appError.code,
      errorMessage: appError.message,
    });
    workerEventHub.publish(event);
    c.executionCtx.waitUntil(
      dispatchWebhookEvent(config, event).catch(() => {
        // Best-effort delivery for webhook notifications.
      }),
    );
    throw appError;
  }
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
