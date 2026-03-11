import type { RuntimeConfig } from "../config/schema.js";
import { AppError } from "./errors.js";

function firstHeaderValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string");
    return typeof first === "string" ? first : undefined;
  }

  return undefined;
}

function readHeaderCaseInsensitive(
  headers: Record<string, unknown>,
  headerName: string,
): string | undefined {
  const direct = firstHeaderValue(headers[headerName]);
  if (direct) {
    return direct;
  }

  const normalized = headerName.toLowerCase();
  const lowerDirect = firstHeaderValue(headers[normalized]);
  if (lowerDirect) {
    return lowerDirect;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalized) {
      return firstHeaderValue(value);
    }
  }

  return undefined;
}

export function resolveApiTokenFromHeaders(
  headers: Record<string, unknown>,
  config: RuntimeConfig,
): string | undefined {
  const configuredHeader = config.POLYGATE_API_TOKEN_HEADER;
  const directHeader = readHeaderCaseInsensitive(headers, configuredHeader)?.trim();

  if (directHeader) {
    return directHeader;
  }

  const authorization = readHeaderCaseInsensitive(headers, "authorization")?.trim();
  if (!authorization) {
    return undefined;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return undefined;
  }

  return match[1]?.trim() || undefined;
}

export function assertPrivateCommandApiToken(
  headers: Record<string, unknown>,
  config: RuntimeConfig,
): void {
  if (!config.POLYGATE_REQUIRE_API_TOKEN_FOR_PRIVATE) {
    return;
  }

  if (config.POLYGATE_API_TOKENS.length === 0) {
    throw new AppError("Private command token auth is enabled but no API tokens are configured", {
      statusCode: 500,
      code: "API_TOKEN_NOT_CONFIGURED",
      expose: false,
    });
  }

  const token = resolveApiTokenFromHeaders(headers, config);
  if (!token) {
    throw new AppError("API token is required for private command execution", {
      statusCode: 401,
      code: "API_TOKEN_REQUIRED",
    });
  }

  if (!config.POLYGATE_API_TOKENS.includes(token)) {
    throw new AppError("Invalid API token", {
      statusCode: 403,
      code: "API_TOKEN_INVALID",
    });
  }
}
