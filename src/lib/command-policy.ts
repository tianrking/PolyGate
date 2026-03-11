import type { RuntimeConfig } from "../config/schema.js";

export type CommandPolicy = {
  disabled: Set<string>;
  forceAuth: Set<string>;
};

export function buildCommandPolicy(config: RuntimeConfig): CommandPolicy {
  return {
    disabled: new Set(config.POLYGATE_DISABLED_COMMANDS),
    forceAuth: new Set(config.POLYGATE_FORCE_AUTH_COMMANDS),
  };
}

export function isCommandDisabled(policy: CommandPolicy, command: string): boolean {
  return policy.disabled.has(command);
}

export function isCommandAuthRequired(
  policy: CommandPolicy,
  command: string,
  defaultAuthRequired: boolean,
): boolean {
  return defaultAuthRequired || policy.forceAuth.has(command);
}
