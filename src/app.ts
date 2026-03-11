import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";

import { buildCommandRegistry, listCommands } from "./commands.js";
import { nodeConfig } from "./config/node.js";
import { normalizeError } from "./lib/errors.js";
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
    const protocol = resolveProtocol(
      getHeaderValue(request.headers["x-forwarded-proto"]) ?? request.protocol,
    );
    const host = getHeaderValue(request.headers.host) ?? "localhost";

    reply.type("text/html; charset=utf-8");
    return renderHomePageHtml({
      runtime: "nodejs",
      commandCount: commandList.length,
      locale: resolveHomeLocale(queryLang, acceptLanguage),
      baseUrl: `${protocol}://${host}`,
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
