import "./env";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db, transaction } from "../lib/db";
import { createInterface } from "node:readline/promises";
const email = process.argv[2];
if (!email || !email.includes("@"))
  throw new Error("Usage: npm run admin:create -- you@example.com");
const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});
// Supply via a secret manager environment or interactive stdin, never a command argument.
const password =
  process.env.ADMIN_PASSWORD ||
  (await terminal.question(
    "New password (12+ characters; input is visible locally): ",
  ));
terminal.close();
if (password.length < 12 || password.length > 128)
  throw new Error("Password must have 12–128 characters");
const hashed = await hashPassword(password);
await transaction(async (c) => {
  if (
    (
      await c.query('SELECT 1 FROM "user" WHERE email=$1', [
        email.toLowerCase(),
      ])
    ).rowCount
  )
    throw new Error(
      "Identity already exists; refusing to change its permissions",
    );
  const id = randomUUID();
  await c.query(
    'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [id, "Studio admin", email.toLowerCase()],
  );
  await c.query(
    'INSERT INTO account(id,"accountId","providerId","userId",password) VALUES($1,$2,\'credential\',$2,$3)',
    [randomUUID(), id, hashed],
  );
  await c.query("INSERT INTO admins(user_id) VALUES($1)", [id]);
});
console.log("Admin provisioned.");
await db.end();
