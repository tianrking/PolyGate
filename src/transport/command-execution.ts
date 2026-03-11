import { z } from "zod";

import type { CommandRegistry } from "../commands.js";
import { AppError } from "../lib/errors.js";

export const executeCommandSchema = z.object({
  command: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
}).strict();

export async function executeCommandPayload(
  registry: CommandRegistry,
  payload: unknown,
  headers: Record<string, unknown>,
): Promise<{ command: string; data: unknown }> {
  const { command, params } = executeCommandSchema.parse(payload ?? {});
  const definition = registry[command];

  if (!definition) {
    throw new AppError(`Unsupported command: ${command}`, {
      statusCode: 404,
      code: "UNKNOWN_COMMAND",
    });
  }

  const parsedParams = definition.schema.parse(params ?? {});
  const data = await definition.execute(parsedParams, headers);

  return { command, data };
}
