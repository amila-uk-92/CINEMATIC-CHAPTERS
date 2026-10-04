import "./env";
import { db, rawSqlite, transaction } from "../lib/db";
import { readdirSync, readFileSync } from "node:fs";

await db.query(
  "CREATE TABLE IF NOT EXISTS migrations(name text PRIMARY KEY, applied_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))",
);

for (const name of readdirSync("migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  const check = await db.query("SELECT 1 FROM migrations WHERE name=$1", [name]);
  if (check.rowCount) continue;

  const sql = readFileSync("migrations/" + name, "utf8");
  rawSqlite.exec(sql);
  await db.query("INSERT INTO migrations(name) VALUES($1)", [name]);
  console.log("Applied " + name);
}

await db.end();
