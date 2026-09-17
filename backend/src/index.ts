import "./loadEnv";
import { app } from "./app";
import { config } from "./config/env";
import { prisma } from "./lib/prisma";
import { startSelfPing } from "./lib/selfPing";

async function main() {
  await prisma.$connect();
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`Kristallball API listening on ${config.port}`);
    startSelfPing();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
