import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";

import { buildCommandRegistry, listCommands } from "./commands.js";
import { nodeConfig } from "./config/node.js";
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

function getHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

function resolveProtocol(value: string | undefined): string {
  const candidate = value?.split(",")[0]?.trim().toLowerCase();

  if (candidate === "https" || candidate === "http") {
    return candidate;
  }

  return "http";
}

function resolveBaseUrl(request: FastifyRequest): string {
  const protocol = resolveProtocol(
    getHeaderValue(request.headers["x-forwarded-proto"]) ?? request.protocol,
  );
  const host = getHeaderValue(request.headers.host) ?? "localhost";

  return `${protocol}://${host}`;
}

export async function buildApp(): Promise<FastifyInstance> {
  const service = new PolymarketService(nodeConfig);
  const registry = buildCommandRegistry(service);
  const eventHub = new MemoryEventHub<CommandExecutionEvent>();
  const policy = buildCommandPolicy(nodeConfig);
  const commandList = listCommands(registry).map((entry) => ({
    ...entry,
    authRequired: isCommandAuthRequired(policy, entry.command, entry.authRequired),
    enabled: !isCommandDisabled(policy, entry.command),
  }));
  const enabledCommandCount = commandList.filter((entry) => entry.enabled).length;
  const app = Fastify({
    logger: {
      level: nodeConfig.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.x-polymarket-private-key",
          "req.headers.authorization",
        ],
        censor: "[REDACTED]",
      },
    },
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: nodeConfig.APP_CORS_ORIGIN === "*" ? true : nodeConfig.APP_CORS_ORIGIN.split(",").map((value) => value.trim()),
  });
  await app.register(rateLimit, {
    max: nodeConfig.RATE_LIMIT_MAX,
    timeWindow: nodeConfig.RATE_LIMIT_WINDOW,
  });

  app.get("/", async (request, reply) => {
    const requestUrl = new URL(request.raw.url ?? "/", "http://localhost");
    const queryLang = requestUrl.searchParams.get("lang");
    const acceptLanguage = getHeaderValue(request.headers["accept-language"]);
    const baseUrl = resolveBaseUrl(request);

    reply.type("text/html; charset=utf-8");
    return renderHomePageHtml({
      runtime: "nodejs",
      commandCount: enabledCommandCount,
      locale: resolveHomeLocale(queryLang, acceptLanguage),
      baseUrl,
    });
  });

  app.get("/health", async () => ({
    ok: true,
    service: "PolyGate",
  }));

  app.get("/api/v1/commands", async () => ({
    success: true,
    data: commandList,
  }));

  app.get("/api/v1/commands/:command", async (request) => {
    const { command } = request.params as { command: string };
    const details = getCommandDetails(
      registry,
      command,
      resolveBaseUrl(request),
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

    return {
      success: true,
      data: details,
    };
  });

  app.get("/api/v1/manifest", async (request) => ({
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
      commands: listCommandDetails(
        registry,
        resolveBaseUrl(request),
        {
          resolveAuthRequired: (name, defaultAuthRequired) =>
            isCommandAuthRequired(policy, name, defaultAuthRequired),
          resolveEnabled: (name) => !isCommandDisabled(policy, name),
        },
      ),
    },
  }));

  app.get("/api/v1/events/stream", async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    reply.raw.write(formatSseComment("connected"));

    const unsubscribe = eventHub.subscribe((event) => {
      reply.raw.write(formatSseEvent("command.execution", event, event.id));
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(formatSseComment("heartbeat"));
    }, nodeConfig.POLYGATE_SSE_HEARTBEAT_MS);

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };

    request.raw.on("close", cleanup);
  });

  app.post("/api/v1/commands/execute", async (request) => {
    const startedAt = Date.now();
    const requestedCommand = extractCommandFromPayload(request.body);

    try {
      const { command, data } = await executeCommandPayload(
        registry,
        request.body,
        request.headers,
        {
          config: nodeConfig,
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
      eventHub.publish(event);
      void dispatchWebhookEvent(nodeConfig, event).catch((error) => {
        app.log.warn({ error }, "Failed to dispatch webhook event");
      });

      return {
        success: true,
        command,
        data,
      };
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
      eventHub.publish(event);
      void dispatchWebhookEvent(nodeConfig, event).catch((webhookError) => {
        app.log.warn({ error: webhookError }, "Failed to dispatch webhook event");
      });
      throw appError;
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    const appError = normalizeError(error);

    reply.status(appError.statusCode).send({
      success: false,
      error: {
        code: appError.code,
        message: appError.expose ? appError.message : "Internal server error",
        details: appError.expose ? appError.details : undefined,
      },
    });
  });

  return app;
}
