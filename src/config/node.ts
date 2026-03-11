import { config as loadDotenv } from "dotenv";

import { parseRuntimeConfig, type RuntimeConfig } from "./schema.js";

loadDotenv();

export const nodeConfig: RuntimeConfig = parseRuntimeConfig(process.env as Record<string, unknown>);
