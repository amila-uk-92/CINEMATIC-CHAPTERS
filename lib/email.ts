import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { db, SQL, transaction, lock } from "./db";
import { DateTime } from "luxon";
function escape(s: unknown) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export async function enqueueEmail(
  c: SQL,
  dedupe: string,
  recipient: string,
  kind: string,
  payload: Record<string, unknown>,
) {
  await c.query(
    "INSERT INTO outbox(id,dedupe,recipient,kind,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedupe) DO NOTHING",
    [randomUUID(), dedupe, recipient, kind, JSON.stringify(payload)],
  );
}
export function emailTemplate(
  kind: string,
  p: Record<string, unknown>,
  brand = "Cinematic Chapters",
  contact = "studio@example.invalid",
  imageURL = "",
) {
  const title =
    (
      {
        "booking-pending": "Your request is received",
        "booking-confirmed": "Your session is confirmed",
        "booking-declined": "An update to your request",
        "booking-cancelled": "Your session is cancelled",
        "booking-rescheduled": "Your session has a new time",
        "gallery-ready": "Your chapter is ready",
        "access-setup": "Set up your private gallery access",
      } as Record<string, string>
    )[kind] || "A studio update";
  const message =
    kind === "booking-pending"
      ? "Your request is pending approval. This is not a confirmed booking."
      : kind === "gallery-ready"
        ? "Your photographs are ready in your private gallery."
        : kind === "access-setup"
          ? "Use the time-limited link below to set your password. This link can be used once."
          : "Please contact the studio if you have any questions.";
  const details = p.start
    ? `${p.package} · ${DateTime.fromISO(String(p.start)).setZone("Europe/London").toFormat("dd LLL yyyy, HH:mm ZZZZ")}`
    : "";
  const link = kind.startsWith("booking")
    ? "mailto:" + contact
    : typeof p.link === "string"
      ? p.link
      : process.env.BETTER_AUTH_URL + "/client";
  const plain = `${brand}\n${title}\n\nHello ${p.name || "there"},\n${message}\n${details}\n${link}`;
  const html = `<!doctype html><html><body style="margin:0;background:#0d0c0a;color:#f2ede4;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td style="padding:40px 20px"><table role="presentation" width="100%" style="max-width:560px;margin:auto;background:#191713;border:1px solid #806849">${imageURL ? `<tr><td><img src="${escape(imageURL)}" alt="${escape(brand)} photography" width="560" style="display:block;width:100%;height:auto"></td></tr>` : ""}<tr><td style="padding:36px"><p style="color:#c8ad7f;letter-spacing:3px;font-size:12px">${escape(brand).toUpperCase()}</p><h1 style="font-family:'Arial Narrow',Impact,sans-serif;font-size:36px;text-transform:uppercase">${escape(title)}</h1><p>Hello ${escape(p.name || "there")},</p><p style="line-height:1.7;color:#b7aea2">${escape(message)}</p><p>${escape(details)}</p><a href="${escape(link)}" style="display:inline-block;padding:16px 24px;border:1px solid #c8ad7f;color:#f2ede4;text-decoration:none">${kind.startsWith("booking") ? "CONTACT THE STUDIO" : "OPEN YOUR GALLERY"}</a></td></tr></table></td></tr></table></body></html>`;
  return { title, plain, html };
}
export function emailHealth() {
  if ((process.env.EMAIL_DRIVER || "preview") === "preview")
    return "Local preview inbox";
  if (!process.env.SMTP_HOST) return "Not configured";
  if (
    process.env.ALLOW_EXTERNAL_MESSAGES !== "true" &&
    !["127.0.0.1", "localhost", "mailpit"].includes(process.env.SMTP_HOST)
  )
    return "External delivery disabled";
  return "Configured · delivery verified per message";
}
export async function deliverOne() {
  return transaction(async (c) => {
    await lock(c, 104);
    const row = (
      await c.query(
        "SELECT * FROM outbox WHERE state IN ('queued','failed') AND attempts<5 AND available_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1",
      )
    ).rows[0];
    if (!row) return false;
    const content = (
      await c.query(
        "SELECT content FROM website_versions WHERE state='published'",
      )
    ).rows[0]?.content;
    const { title, html, plain } = emailTemplate(
      row.kind,
      row.payload,
      content?.brand,
      content?.email,
      content?.hero?.[0]
        ? process.env.BETTER_AUTH_URL +
            "/api/media/" +
            content.hero[0].id +
            "?w=800"
        : "",
    );
    const attempt = row.attempts + 1;
    try {
      let state = "preview",
        providerId = null;
      if ((process.env.EMAIL_DRIVER || "preview") !== "preview") {
        if (!process.env.SMTP_HOST || emailHealth().includes("disabled"))
          throw new Error(
            "Email integration not configured or external delivery disabled",
          );
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 1025),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            : undefined,
        });
        const response = await transport.sendMail({
          from: process.env.EMAIL_FROM,
          to: row.recipient,
          subject: title,
          text: plain,
          html,
          messageId: `<${row.id}@chapters.local>`,
        });
        providerId = response.messageId;
        state = "accepted";
      }
      await c.query(
        "UPDATE outbox SET state=$2,attempts=$3,html=$4,plain=$5,provider_id=$6,error=NULL WHERE id=$1",
        [row.id, state, attempt, html, plain, providerId],
      );
      await c.query(
        "INSERT INTO notification_attempts(outbox_id,state) VALUES($1,$2)",
        [row.id, state],
      );
    } catch {
      await c.query(
        "UPDATE outbox SET state='failed',attempts=$2,error='Delivery failed; check adapter configuration',available_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+' || $3 || ' seconds') WHERE id=$1",
        [row.id, attempt, Math.min(3600, 30 * 2 ** attempt)],
      );
      await c.query(
        "INSERT INTO notification_attempts(outbox_id,state,error) VALUES($1,'failed','Adapter delivery failed')",
        [row.id],
      );
    }
    return true;
  });
}
