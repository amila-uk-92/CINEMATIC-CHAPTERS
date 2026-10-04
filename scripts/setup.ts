import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
mkdirSync(".data", { recursive: true });
if (!existsSync(".env.local")) {
  writeFileSync(
    ".env.local",
    `DATABASE_URL=.data/chapters.sqlite\nBETTER_AUTH_URL=http://127.0.0.1:3000\nBETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}\nSTORAGE_DRIVER=local\nLOCAL_STORAGE_PATH=.data/objects\nEMAIL_DRIVER=preview\nALLOW_EXTERNAL_MESSAGES=false\n`,
    { mode: 0o600 },
  );
  console.log("Created private .env.local with SQLite database.");
} else console.log("Preserved existing .env.local.");
