import "./env";
import { createDatabase, SqliteClient, db } from "../lib/db";
import { spawn, ChildProcess } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import {
  readFileSync,
  readdirSync,
  mkdtempSync,
  rmSync,
  promises as fs,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import { demoContent, assetIds } from "../lib/content";

const dir = mkdtempSync(path.join(tmpdir(), "chapters-browser-"));
const root = path.join(dir, "objects");
await fs.mkdir(root, { recursive: true });

const dbPath = path.join(dir, "browser.sqlite");
const sqlite = createDatabase(dbPath);
const fixture = new SqliteClient(sqlite);

const children: ChildProcess[] = [];
let serverError = "";
const runId = randomUUID().replaceAll("-", "");

try {
  for (const file of readdirSync("migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync("migrations/" + file, "utf8"));

  const c = structuredClone(demoContent);
  const seed = (
    await db.query(
      "SELECT content FROM website_versions WHERE state='published'",
    )
  ).rows[0]?.content;

  let assets: any[] = [];
  if (seed) {
    const ids = assetIds(seed);
    assets = (
      await db.query(
        "SELECT * FROM assets WHERE id=ANY($1::uuid[]) AND status='ready'",
        [ids],
      )
    ).rows;
    c.hero = seed.hero;
    c.wall = seed.wall;
    c.team = seed.team;
  }
  for (const a of assets) {
    await fixture.query(
      "INSERT INTO assets(id,scope,key,preview_key,filename,mime,bytes,preview_bytes,width,height,alt,status) VALUES($1,'public',$2,$3,$4,$5,$6,$7,$8,$9,$10,'ready')",
      [
        a.id,
        a.key,
        a.preview_key,
        a.filename,
        a.mime,
        a.bytes,
        a.preview_bytes,
        a.width,
        a.height,
        a.alt,
      ],
    );
    for (const key of [a.key, a.preview_key]) {
      if (!key) continue;
      const file = path.join(root, key);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.copyFile(
        path.resolve(process.env.LOCAL_STORAGE_PATH || ".data/objects", key),
        file,
      );
    }
  }
  if (!assets.length) {
    const fallback = path.join(root, "public", "fallback.jpg");
    await fs.mkdir(path.dirname(fallback), { recursive: true });
    await sharp({
      create: { width: 1200, height: 800, channels: 3, background: "#333333" },
    })
      .jpeg()
      .toFile(fallback);
    const id = randomUUID();
    await fixture.query(
      "INSERT INTO assets(id,scope,key,filename,mime,bytes,status) VALUES($1,'public','public/fallback.jpg','fallback.jpg','image/jpeg',1000,'ready')",
      [id],
    );
    c.hero = [{ id, alt: "Fallback", desktop: 50, mobile: 50 }];
  }
  for (const state of ["draft", "published"])
    await fixture.query(
      "INSERT INTO website_versions(state,content) VALUES($1,$2)",
      [state, JSON.stringify(c)],
    );
  for (const p of c.packages)
    await fixture.query("INSERT INTO packages(id,data) VALUES($1,$2)", [
      p.id,
      JSON.stringify(p),
    ]);
  const settings = {
    weekly: {
      1: ["09:00", "19:00"],
      2: ["09:00", "19:00"],
      3: ["09:00", "19:00"],
      4: ["09:00", "19:00"],
      5: ["09:00", "19:00"],
      6: ["09:00", "19:00"],
      7: ["09:00", "19:00"],
    },
    overrides: {},
    blocks: [],
    buffer: 30,
    noticeHours: 0,
    horizonDays: 180,
    pendingHours: 48,
  };
  await fixture.query("INSERT INTO resource(id,settings) VALUES(1,$1)", [
    JSON.stringify(settings),
  ]);
  await fixture.query("INSERT INTO storage(id,allowance) VALUES(1,1073741824)");
  const password = randomBytes(24).toString("base64url");
  const adminId = randomUUID(),
    email = "browser-admin@example.invalid";
  await fixture.query(
    'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,\'Browser test admin\',$2,true)',
    [adminId, email],
  );
  await fixture.query(
    'INSERT INTO account(id,"accountId","providerId","userId",password) VALUES($1,$2,\'credential\',$2,$3)',
    [randomUUID(), adminId, await hashPassword(password)],
  );
  await fixture.query("INSERT INTO admins(user_id) VALUES($1)", [adminId]);
  const file = path.join(dir, "test-photo.png");
  await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#806849" },
  })
    .png()
    .toFile(file);
  const env = {
    ...process.env,
    NEXT_BUILD_DIR: ".data/browser-next-" + runId,
    DATABASE_URL: dbPath,
    BETTER_AUTH_URL: "http://127.0.0.1:3010",
    LOCAL_STORAGE_PATH: root,
    STORAGE_DRIVER: "local",
    EMAIL_DRIVER: "preview",
    ALLOW_EXTERNAL_MESSAGES: "false",
    UI_TEST_URL: "http://127.0.0.1:3010",
    UI_TEST_ADMIN_EMAIL: email,
    UI_TEST_ADMIN_PASSWORD: password,
    UI_TEST_UPLOAD: file,
    TEST_ISOLATED: "true",
  };
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3010",
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  children.push(server);
  server.stdout?.on("data", (d) => (serverError += d.toString()));
  server.stderr?.on("data", (d) => (serverError += d.toString()));
  const worker = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/worker.ts"],
    { env, stdio: "inherit" },
  );
  children.push(worker);
  for (let n = 0; n < 120; n++) {
    try {
      const res = await fetch("http://127.0.0.1:3010");
      if (res.ok) break;
    } catch {}
    if (n === 119)
      throw new Error(
        "Browser test app failed to start: " + serverError.slice(-2000),
      );
    await new Promise((r) => setTimeout(r, 500));
  }
  const test = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    { env, stdio: "inherit" },
  );
  children.push(test);
  process.exitCode = await new Promise<number>((resolve) =>
    test.on("exit", (n) => resolve(n ?? 1)),
  );
} finally {
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  await fixture.end();
  rmSync(dir, { recursive: true, force: true });
  rmSync(".data/browser-next-" + runId, { recursive: true, force: true });
  // Next adds generated type directories to tsconfig. Remove only this run's temporary entries.
  const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8"));
  tsconfig.include = tsconfig.include.filter(
    (entry: string) => !entry.startsWith(".data/browser-next-" + runId + "/"),
  );
  await fs.writeFile("tsconfig.json", JSON.stringify(tsconfig, null, 2) + "\n");
}
