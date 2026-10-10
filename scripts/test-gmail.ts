import "./env";
import { bookingEmail } from "../lib/booking-email";
import { smtpTransport, inlineEmailGraphics } from "../lib/email-transport";

// Explicit test destination; does not process existing customer notifications.
const recipient = "amila.indrajith.ukwattage@gmail.com";
if (process.env.SMTP_HOST !== "smtp.gmail.com" || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
  console.error("Gmail test needs SMTP_HOST=smtp.gmail.com, SMTP_USER and SMTP_PASSWORD in .env.local.");
  process.exitCode = 1;
} else {
  const transport = smtpTransport();
  try {
    await transport.verify();
    console.log("Gmail SMTP authentication verified.");
    for (const kind of ["booking-pending", "booking-confirmed"] as const) {
      const email = bookingEmail(kind, { name: "there", package: "Together Chapters", price: 17500, duration: 90, location: "Fictional test location — no booking created" }, "Cinematic Chapters", process.env.SMTP_USER);
      const result = await transport.sendMail({
        from: process.env.EMAIL_FROM || `Cinematic Chapters <${process.env.SMTP_USER}>`,
        replyTo: process.env.SMTP_USER,
        to: recipient,
        subject: `[TEST] ${email.title}`,
        text: `DESIGN TEST ONLY — no real booking or payment.\n\n${email.plain}`,
        ...inlineEmailGraphics(email.html.replace('<table role="presentation" width="100%"', '<p style="text-align:center;font:12px Arial">DESIGN TEST ONLY — no real booking or payment.</p><table role="presentation" width="100%"')),
      });
      if (!result.accepted?.includes(recipient)) throw new Error("Recipient was not accepted");
      console.log(`${kind}: Gmail accepted the test for ${recipient}. Message ID: ${result.messageId}`);
    }
  } catch (error) {
    const details = error as { code?: string; responseCode?: number; message?: string };
    console.error(`Gmail test failed (${details.code || "unknown"}${details.responseCode ? ` / ${details.responseCode}` : ""}). Check the app password and network connection.`);
    const secret = process.env.SMTP_PASSWORD?.replace(/\s/g, "");
    const diagnostic = (details.message || "").split(process.env.SMTP_PASSWORD || "\0").join("[redacted]").split(secret || "\0").join("[redacted]");
    console.error(diagnostic);
    process.exitCode = 1;
  } finally {
    transport.close();
  }
}
