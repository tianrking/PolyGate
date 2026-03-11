import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";

import { buildCommandRegistry, listCommands } from "./commands.js";
import { nodeConfig } from "./config/node.js";
import { normalizeError } from "./lib/errors.js";
import { renderHomePageHtml } from "./lib/homepage.js";
import { PolymarketService } from "./services/polymarket-service.js";
import { executeCommandPayload } from "./transport/command-execution.js";

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

  app.get("/", async (_request, reply) => {
    reply.type("text/html; charset=utf-8");
    return renderHomePageHtml({
      runtime: "nodejs",
      commandCount: commandList.length,
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
