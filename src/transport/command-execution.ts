import { z } from "zod";

import type { CommandRegistry } from "../commands.js";
import type { RuntimeConfig } from "../config/schema.js";
import { assertPrivateCommandApiToken } from "../lib/api-token.js";
import { AppError } from "../lib/errors.js";
import { hasWalletCredentials } from "../lib/wallet.js";

export const executeCommandSchema = z.object({
  command: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
}).strict();

export type ExecuteCommandOptions = {
  config?: RuntimeConfig;
  isCommandDisabled?: (command: string) => boolean;
  isAuthRequired?: (
    command: string,
    defaultAuthRequired: boolean,
  ) => boolean;
};

export async function executeCommandPayload(
  registry: CommandRegistry,
  payload: unknown,
  headers: Record<string, unknown>,
  options?: ExecuteCommandOptions,
): Promise<{ command: string; data: unknown }> {
  const { command, params } = executeCommandSchema.parse(payload ?? {});
  const definition = registry[command];

  if (!definition) {
    throw new AppError(`Unsupported command: ${command}`, {
      statusCode: 404,
      code: "UNKNOWN_COMMAND",
    });
  }

  if (options?.isCommandDisabled?.(command)) {
    throw new AppError(`Command is disabled by policy: ${command}`, {
      statusCode: 403,
      code: "COMMAND_DISABLED",
    });
  }

  const authRequired = options?.isAuthRequired?.(command, definition.authRequired)
    ?? definition.authRequired;

  if (authRequired && options?.config) {
    assertPrivateCommandApiToken(headers, options.config);

    if (!hasWalletCredentials(headers, options.config)) {
      throw new AppError("No wallet configured for authenticated command", {
        statusCode: 401,
        code: "WALLET_REQUIRED",
      });
    }
  }

  const parsedParams = definition.schema.parse(params ?? {});
  const data = await definition.execute(parsedParams, headers);

  return { command, data };
}
