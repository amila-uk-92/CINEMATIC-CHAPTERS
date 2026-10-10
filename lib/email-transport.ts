import nodemailer from "nodemailer";
import { resolve } from "node:path";

export function smtpTransport() {
  if (!process.env.SMTP_HOST) throw new Error("SMTP_HOST is missing");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 1025),
    secure: Number(process.env.SMTP_PORT) === 465,
    requireTLS: Number(process.env.SMTP_PORT) === 587,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD?.replace(/\s/g, "") }
      : undefined,
  });
}

// Inline graphics remain visible before the new assets are deployed to the website.
export function inlineEmailGraphics(html: string) {
  const attachments: { filename: string; path: string; cid: string }[] = [];
  for (const filename of ["chapter-header.png", "chapter-footer.png"]) {
    const pattern = new RegExp(`https?://[^"\\s]+/email/${filename.replace(".", "\\.")}`, "g");
    if (!pattern.test(html)) continue;
    const cid = `${filename}@cinematic-chapters`;
    html = html.replace(pattern, `cid:${cid}`);
    attachments.push({ filename, path: resolve("public/email", filename), cid });
  }
  return { html, attachments };
}
