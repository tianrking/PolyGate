import type { RuntimeConfig } from "../config/schema.js";

export type CommandExecutionEvent = {
  id: string;
  type: "command.execution";
  timestamp: string;
  command: string;
  success: boolean;
  durationMs: number;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
};

export type EventSubscriber<T> = (event: T) => void;

export class MemoryEventHub<T> {
  private readonly subscribers = new Set<EventSubscriber<T>>();

  subscribe(subscriber: EventSubscriber<T>): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  publish(event: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(event);
      } catch {
        // Ignore subscriber errors to avoid breaking other listeners.
      }
    }
  }
}

export function createCommandExecutionEvent(input: {
  command: string;
  success: boolean;
  durationMs: number;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
}): CommandExecutionEvent {
  const event: CommandExecutionEvent = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    type: "command.execution",
    timestamp: new Date().toISOString(),
    command: input.command,
    success: input.success,
    durationMs: input.durationMs,
  };

  if (input.statusCode !== undefined) {
    event.statusCode = input.statusCode;
  }
  if (input.errorCode !== undefined) {
    event.errorCode = input.errorCode;
  }
  if (input.errorMessage !== undefined) {
    event.errorMessage = input.errorMessage;
  }

  return event;
}

export function formatSseEvent(eventName: string, payload: unknown, id?: string): string {
  const lines: string[] = [];

  if (id) {
    lines.push(`id: ${id}`);
  }
  lines.push(`event: ${eventName}`);
  lines.push(`data: ${JSON.stringify(payload)}`);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function formatSseComment(comment: string): string {
  return `: ${comment}\n\n`;
}

function readWebhookConfig(config: RuntimeConfig): {
  url: string | undefined;
  bearerToken: string | undefined;
  timeoutMs: number;
} {
  return {
    url: config.POLYGATE_WEBHOOK_URL,
    bearerToken: config.POLYGATE_WEBHOOK_BEARER_TOKEN,
    timeoutMs: config.POLYGATE_WEBHOOK_TIMEOUT_MS,
  };
}

export async function dispatchWebhookEvent(
  config: RuntimeConfig,
  event: CommandExecutionEvent,
): Promise<void> {
  const webhook = readWebhookConfig(config);
  if (!webhook.url) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, webhook.timeoutMs);

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "polygate/0.1.0",
        ...(webhook.bearerToken
          ? { authorization: `Bearer ${webhook.bearerToken}` }
          : {}),
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export function extractCommandFromPayload(payload: unknown): string {
  if (typeof payload === "object" && payload !== null) {
    const value = (payload as Record<string, unknown>).command;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return "__unknown__";
}
