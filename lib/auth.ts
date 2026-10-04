import { betterAuth } from "better-auth";
import { db, rawSqlite } from "./db";
export const auth = betterAuth({
  appName: "Cinematic Chapters",
  database: rawSqlite,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://127.0.0.1:3000",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 40,
    customRules: { "/sign-in/email": { window: 300, max: 8 } },
  },
  advanced: {
    useSecureCookies: (process.env.BETTER_AUTH_URL || "").startsWith(
      "https://",
    ),
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
});
export async function identity(headers: Headers) {
  return (await auth.api.getSession({ headers }))?.user;
}
export async function requireAdmin(headers: Headers) {
  const u = await identity(headers);
  if (
    !u ||
    !(await db.query("SELECT 1 FROM admins WHERE user_id=$1", [u.id])).rowCount
  )
    throw new Error("Forbidden");
  return u;
}
export async function requireClient(headers: Headers) {
  const u = await identity(headers);
  const customer =
    u &&
    (
      await db.query(
        "SELECT * FROM customers WHERE user_id=$1 AND NOT revoked AND deleted_at IS NULL",
        [u.id],
      )
    ).rows[0];
  if (!customer) throw new Error("Forbidden");
  return customer;
}
