import "./env";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
const url = new URL(process.env.DATABASE_URL!);
const pg = new EmbeddedPostgres({
  databaseDir: ".data/postgres",
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port),
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(".data/postgres/PG_VERSION")) await pg.initialise();
await pg.start();
const c = pg.getPgClient();
await c.connect();
if (
  !(
    await c.query("SELECT 1 FROM pg_database WHERE datname=$1", [
      url.pathname.slice(1),
    ])
  ).rowCount
)
  await pg.createDatabase(url.pathname.slice(1));
await c.end();
console.log("Project-local PostgreSQL running on loopback port " + url.port);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
setInterval(() => {}, 10000);
