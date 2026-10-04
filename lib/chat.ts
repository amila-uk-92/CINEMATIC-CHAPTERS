import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db, transaction } from "./db";
import { hash, cookie, sessionCookie } from "./http";
import { queue } from "./gallery";
export function telegramConfigured() {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_CHAT_ID &&
    process.env.TELEGRAM_USER_IDS &&
    process.env.TELEGRAM_WEBHOOK_SECRET,
  );
}
export function chatHealth() {
  return !telegramConfigured()
    ? "Not configured"
    : process.env.ALLOW_EXTERNAL_MESSAGES !== "true"
      ? "External delivery disabled"
      : "Configured · awaiting Telegram";
}
export async function getConversation(request: Request, create = false) {
  const token = cookie(request, "chapters-chat");
  let conversation =
    token &&
    (
      await db.query(
        "SELECT * FROM conversations WHERE token_hash=$1 AND expires_at>now()",
        [hash(token)],
      )
    ).rows[0];
  let header: string | undefined;
  if (!conversation && create) {
    const next = randomBytes(32).toString("base64url"),
      id = randomUUID();
    conversation = (
      await db.query(
        "INSERT INTO conversations(id,token_hash,expires_at) VALUES($1,$2,now()+interval '7 days') RETURNING *",
        [id, hash(next)],
      )
    ).rows[0];
    header = sessionCookie("chapters-chat", next, 7 * 86400);
  }
  return { conversation, header };
}
export async function sendVisitor(request: Request, raw: unknown) {
  if (chatHealth() !== "Configured · awaiting Telegram")
    throw new Error(
      "Website chat is not configured. Please contact the studio by email",
    );
  const body = z
    .object({ message: z.string().trim().min(1).max(2000) })
    .parse(raw);
  const { conversation, header } = await getConversation(request, true);
  const id = randomUUID();
  await transaction(async (c) => {
    await c.query(
      "INSERT INTO chat_messages(id,conversation_id,sender,body) VALUES($1,$2,'visitor',$3)",
      [id, conversation.id, body.message],
    );
    await queue(c, "telegram", { id });
  });
  return { id, header };
}
export async function relayTelegram(id: string) {
  const message = (
    await db.query("SELECT * FROM chat_messages WHERE id=$1", [id])
  ).rows[0];
  if (!message || message.telegram_message_id) return;
  if (chatHealth() !== "Configured · awaiting Telegram")
    throw new Error("Telegram not configured or outbound disabled");
  const r = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `Website conversation ${message.conversation_id.slice(0, 8)}\n\n${message.body}\n\nReply to THIS message to respond in the visitor’s website chat.`,
        protect_content: true,
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const data = await r.json();
  if (!r.ok || !data.ok) throw new Error("Telegram delivery failed");
  await db.query(
    "UPDATE chat_messages SET telegram_message_id=$2,state='sent' WHERE id=$1",
    [id, data.result.message_id],
  );
}
export async function receiveTelegram(request: Request, raw: unknown) {
  const supplied = request.headers.get("x-telegram-bot-api-secret-token") || "",
    secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  if (
    !telegramConfigured() ||
    supplied.length !== secret.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))
  )
    throw new Error("Forbidden");
  const v = z
    .object({
      update_id: z.number().int(),
      message: z
        .object({
          chat: z.object({ id: z.number() }),
          from: z.object({ id: z.number() }),
          text: z.string().max(4000),
          reply_to_message: z.object({ message_id: z.number() }).optional(),
        })
        .optional(),
    })
    .parse(raw);
  if (!v.message) return { ok: true };
  const m = v.message;
  const authorised = (process.env.TELEGRAM_USER_IDS || "")
    .split(",")
    .map((s) => s.trim());
  if (
    String(m.chat.id) !== process.env.TELEGRAM_CHAT_ID ||
    !authorised.includes(String(m.from.id))
  )
    throw new Error("Forbidden");
  if (!m.reply_to_message || m.text.startsWith("/")) return { ok: true };
  return transaction(async (c) => {
    if (
      !(
        await c.query(
          "INSERT INTO telegram_updates(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",
          [v.update_id],
        )
      ).rowCount
    )
      return { ok: true };
    const original = (
      await c.query(
        "SELECT m.conversation_id FROM chat_messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.telegram_message_id=$1 AND c.expires_at>now()",
        [m.reply_to_message!.message_id],
      )
    ).rows[0];
    if (!original) return { ok: true };
    await c.query(
      "INSERT INTO chat_messages(id,conversation_id,sender,body,state) VALUES($1,$2,'team',$3,'sent')",
      [randomUUID(), original.conversation_id, m.text],
    );
    return { ok: true };
  });
}
