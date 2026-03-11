import { UpstreamError } from "./errors.js";

type QueryValue = string | number | boolean | null | undefined | Array<string | number | boolean>;

export type HttpRequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  timeoutMs: number;
  headers?: Record<string, string>;
  upstreamService: string;
};

function appendQueryValue(searchParams: URLSearchParams, key: string, value: QueryValue): void {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      searchParams.append(key, String(item));
    }
    return;
  }

  searchParams.set(key, String(value));
}

export async function requestJson<T>(baseUrl: string, path: string, options: HttpRequestOptions): Promise<T> {
  const url = new URL(path.replace(/^\//, ""), baseUrl);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    appendQueryValue(url.searchParams, key, value);
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json, text/plain;q=0.9",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(options.timeoutMs),
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, init).catch((error: unknown) => {
    throw new UpstreamError("Failed to reach upstream service", {
      upstreamService: options.upstreamService,
      upstreamStatus: undefined,
      cause: error,
    });
  });

  const text = await response.text();
  const trimmed = text.trim();
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json") || (trimmed.startsWith("{") || trimmed.startsWith("["));
  const data = trimmed.length === 0 ? null : isJson ? JSON.parse(trimmed) : trimmed;

  if (!response.ok) {
    throw new UpstreamError(
      typeof data === "string" && data.length > 0 ? data : `${options.upstreamService} request failed`,
      {
        upstreamService: options.upstreamService,
        upstreamStatus: response.status,
        details: data,
      },
    );
  }

  return data as T;
}
