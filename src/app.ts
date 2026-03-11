import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";

import { buildCommandRegistry, listCommands } from "./commands.js";
import { nodeConfig } from "./config/node.js";
import { getCommandDetails, listCommandDetails } from "./lib/command-catalog.js";
import { AppError, normalizeError } from "./lib/errors.js";
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
  const commandList = listCommands(registry);
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
      commandCount: commandList.length,
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
    const details = getCommandDetails(registry, command, resolveBaseUrl(request));

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
        execute: "/api/v1/commands/execute",
      },
      commands: listCommandDetails(registry, resolveBaseUrl(request)),
    },
  }));

  app.post("/api/v1/commands/execute", async (request) => {
    const { command, data } = await executeCommandPayload(
      registry,
      request.body,
      request.headers,
    );

    return {
      success: true,
      command,
      data,
    };
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
