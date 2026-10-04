import { createHash } from "node:crypto";
import { db } from "./db";
export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin !==
    new URL(process.env.BETTER_AUTH_URL || "http://127.0.0.1:3000").origin
  )
    throw new Error("Invalid request origin");
}
export async function rateLimit(key: string, max = 30, seconds = 60) {
  const r = await db.query(
    `INSERT INTO rate_limits(key,count,resets_at) VALUES($1,1,strftime('%Y-%m-%dT%H:%M:%fZ','now','+' || $2 || ' seconds')) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN resets_at<strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN 1 ELSE rate_limits.count+1 END,resets_at=CASE WHEN resets_at<strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN strftime('%Y-%m-%dT%H:%M:%fZ','now','+' || $2 || ' seconds') ELSE rate_limits.resets_at END RETURNING count`,
    [key, seconds],
  );
  if (r.rows[0].count > max)
    throw new Error("Too many requests. Please try again later.");
}
export function cookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + "="))
    ?.slice(name.length + 1);
}
export function sessionCookie(name: string, value: string, maxAge: number) {
  return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${(process.env.BETTER_AUTH_URL || "").startsWith("https://") ? "; Secure" : ""}`;
}
export function ipKey(request: Request) {
  // No untrusted forwarded header used for rate-limit identity.
  return hash(
    cookie(request, "chapters-chat") ||
      request.headers.get("user-agent") ||
      "anonymous",
  );
}
