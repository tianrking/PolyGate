import { buildApp } from "./app.js";
import { nodeConfig } from "./config/node.js";

const app = await buildApp();

try {
  await app.listen({
    host: nodeConfig.HOST,
    port: nodeConfig.PORT,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
