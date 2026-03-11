import { z } from "zod";

import type { CommandName, CommandRegistry } from "../commands.js";

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema | JsonSchema[];
  enum?: unknown[];
  default?: unknown;
  examples?: unknown[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  format?: string;
  pattern?: string;
  minimum?: number;
  exclusiveMinimum?: number | boolean;
};

export type CommandDetails = {
  command: CommandName;
  description: string;
  authRequired: boolean;
  paramsSchema: JsonSchema;
  paramsExample: unknown;
  curlExample: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\/+$/, "");
}

function unwrapCandidateSchema(schema: JsonSchema): JsonSchema {
  if (schema.oneOf && schema.oneOf.length > 0) {
    const first = schema.oneOf[0];
    if (first) {
      return unwrapCandidateSchema(first);
    }
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    const first = schema.anyOf[0];
    if (first) {
      return unwrapCandidateSchema(first);
    }
  }

  if (schema.allOf && schema.allOf.length > 0) {
    const first = schema.allOf[0];
    if (first) {
      return unwrapCandidateSchema(first);
    }
  }

  return schema;
}

function stringExample(schema: JsonSchema): string {
  const firstEnum = schema.enum?.[0];
  if (typeof firstEnum === "string") {
    return firstEnum;
  }

  if (schema.format === "date") {
    return "2026-03-12";
  }
  if (schema.format === "date-time") {
    return "2026-03-12T00:00:00Z";
  }
  if (schema.format === "email") {
    return "name@example.com";
  }
  if (schema.pattern?.includes("0x") && schema.pattern.includes("{64}")) {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }
  if (schema.pattern?.includes("0x")) {
    return "0x0000000000000000000000000000000000000000";
  }

  return "string";
}

function numberExample(schema: JsonSchema): number {
  if (typeof schema.exclusiveMinimum === "number") {
    return Math.ceil(schema.exclusiveMinimum + 1);
  }

  if (typeof schema.minimum === "number") {
    return schema.minimum > 0 ? schema.minimum : 1;
  }

  return 1;
}

function buildExampleFromJsonSchema(schema: JsonSchema, depth = 0): unknown {
  if (depth > 6) {
    return {};
  }

  const candidate = unwrapCandidateSchema(schema);

  if (candidate.examples && candidate.examples.length > 0) {
    return candidate.examples[0];
  }
  if (candidate.default !== undefined) {
    return candidate.default;
  }

  if (candidate.enum && candidate.enum.length > 0) {
    return candidate.enum[0];
  }

  const type = Array.isArray(candidate.type) ? candidate.type[0] : candidate.type;

  if (type === "object" || candidate.properties) {
    const result: Record<string, unknown> = {};
    const properties = candidate.properties ?? {};
    const requiredSet = new Set(candidate.required ?? []);

    for (const [key, value] of Object.entries(properties)) {
      if (!requiredSet.has(key) && Object.keys(result).length >= 10) {
        continue;
      }
      result[key] = buildExampleFromJsonSchema(value, depth + 1);
    }

    return result;
  }

  if (type === "array") {
    const items = Array.isArray(candidate.items) ? candidate.items[0] : candidate.items;
    if (!items) {
      return [];
    }
    return [buildExampleFromJsonSchema(items, depth + 1)];
  }

  if (type === "string") {
    return stringExample(candidate);
  }

  if (type === "number" || type === "integer") {
    return numberExample(candidate);
  }

  if (type === "boolean") {
    return false;
  }

  if (type === "null") {
    return null;
  }

  return {};
}

function buildCurlExample(baseUrl: string, command: string, paramsExample: unknown): string {
  const params = typeof paramsExample === "object" && paramsExample !== null ? paramsExample : {};
  const payload = JSON.stringify({
    command,
    params,
  });

  return `curl -X POST "${baseUrl}/api/v1/commands/execute" \\
  -H 'content-type: application/json' \\
  -d '${payload}'`;
}

function safeToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  try {
    return z.toJSONSchema(schema, {
      target: "draft-7",
      io: "input",
      unrepresentable: "any",
    }) as JsonSchema;
  } catch {
    return {
      type: "object",
      additionalProperties: true,
    } as JsonSchema;
  }
}

function toCommandDetails(baseUrl: string, command: string, definition: CommandRegistry[CommandName]): CommandDetails {
  const paramsSchema = safeToJsonSchema(definition.schema);
  const paramsExample = buildExampleFromJsonSchema(paramsSchema);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const commandName = command as CommandName;

  return {
    command: commandName,
    description: definition.description,
    authRequired: definition.authRequired,
    paramsSchema,
    paramsExample,
    curlExample: buildCurlExample(normalizedBaseUrl, command, paramsExample),
  };
}

export function listCommandDetails(
  registry: CommandRegistry,
  baseUrl: string,
): CommandDetails[] {
  return Object.entries(registry).map(([command, definition]) =>
    toCommandDetails(baseUrl, command, definition),
  );
}

export function getCommandDetails(
  registry: CommandRegistry,
  command: string,
  baseUrl: string,
): CommandDetails | undefined {
  const definition = registry[command as CommandName];
  if (!definition) {
    return undefined;
  }

  return toCommandDetails(baseUrl, command, definition);
}
