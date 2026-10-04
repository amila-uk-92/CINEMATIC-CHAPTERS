import "./env";
import { createDatabase } from "../lib/db";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "chapters-test-"));
const dbPath = path.join(dir, "test.sqlite");
const sqlite = createDatabase(dbPath);

try {
  for (const file of readdirSync("migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    sqlite.exec(readFileSync("migrations/" + file, "utf8"));
  }
  sqlite.close();

  const child = spawn(
    process.execPath,
    ["--import", "tsx", "--test", "tests/workflows.test.ts"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: dbPath,
        LOCAL_STORAGE_PATH: dir,
        EMAIL_DRIVER: "preview",
        ALLOW_EXTERNAL_MESSAGES: "false",
        TEST_ISOLATED: "true",
      },
    },
  );
  const code = await new Promise<number>((r) =>
    child.on("exit", (n) => r(n ?? 1)),
  );
  process.exitCode = code;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
