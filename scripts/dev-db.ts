/**
 * Local PostgreSQL for machines without Docker/Postgres installed.
 * Uses the `embedded-postgres` dev dependency (real Postgres binaries).
 * Usage: npm run db:local   (keep running in a separate terminal)
 * Production and CI use a normal managed PostgreSQL instance instead.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".pgdata");
const port = Number(process.env.LOCAL_PG_PORT ?? 54329);

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "tripora",
    password: "tripora",
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) await pg.createDatabase("tripora");
  console.log(`Local Postgres ready: postgresql://tripora:tripora@localhost:${port}/tripora`);
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
