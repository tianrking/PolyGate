import { ApiError } from "@polymarket/clob-client";
import { ZodError } from "zod";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(message: string, options?: {
    statusCode?: number;
    code?: string;
    details?: unknown;
    expose?: boolean;
    cause?: unknown;
  }) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.statusCode = options?.statusCode ?? 500;
    this.code = options?.code ?? "INTERNAL_ERROR";
    this.details = options?.details;
    this.expose = options?.expose ?? this.statusCode < 500;
  }
}

export class UpstreamError extends AppError {
  readonly upstreamService: string;
  readonly upstreamStatus: number | undefined;

  constructor(message: string, options: {
    upstreamService: string;
    upstreamStatus: number | undefined;
    details?: unknown;
    cause?: unknown;
  }) {
    super(message, {
      statusCode: options.upstreamStatus && options.upstreamStatus < 500 ? 502 : 503,
      code: "UPSTREAM_ERROR",
      details: options.details,
      expose: true,
      cause: options.cause,
    });

    this.name = "UpstreamError";
    this.upstreamService = options.upstreamService;
    this.upstreamStatus = options.upstreamStatus;
  }
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError("Invalid request parameters", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details: error.flatten(),
      expose: true,
      cause: error,
    });
  }

  if (error instanceof ApiError) {
    return new UpstreamError(error.message, {
      upstreamService: "clob",
      upstreamStatus: error.status,
      details: error.data,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new AppError(error.message, {
      cause: error,
      expose: false,
    });
  }

  return new AppError("Unexpected failure", { details: error, expose: false });
}
