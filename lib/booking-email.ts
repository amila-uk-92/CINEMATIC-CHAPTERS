import { DateTime } from "luxon";

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
);
const money = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value / 100);

export function bookingEmail(
  kind: "booking-pending" | "booking-confirmed",
  payload: Record<string, unknown>,
  brand: string,
  contact: string,
  assetOrigin = "https://cinematic-chapters.co.uk",
) {
  const headingFont = "'Barlow Condensed','Arial Narrow',Impact,Arial,sans-serif";
  const confirmed = kind === "booking-confirmed";
  const title = confirmed ? "Your next chapter is approved" : "Your request is in";
  const intro = confirmed
    ? "Your session request has been approved. We’re looking forward to capturing your next chapter."
    : "Thank you for choosing us. We’ll check your date and location, then get in touch with the next steps.";
  const status = confirmed ? "REQUEST APPROVED" : "AWAITING CONFIRMATION";
  const notice = confirmed
    ? "A 25% deposit secures your date and comes off the total. We’ll arrange payment with you. This email does not confirm receipt of payment."
    : "This is not a confirmed booking. Once the details are agreed, a 25% deposit secures your date and comes off the total.";
  const date = typeof payload.start === "string" ? DateTime.fromISO(payload.start).setZone("Europe/London") : null;
  const price = typeof payload.price === "number" && Number.isFinite(payload.price) && payload.price >= 0 ? payload.price : null;
  const deposit = price === null ? null : Math.round(price * 0.25);
  const rows: [string, string][] = [
    ["Package", String(payload.package || "To be agreed")],
    [confirmed ? "Session date" : "Preferred date", date?.isValid ? date.toFormat("cccc d LLLL yyyy") : "To be agreed"],
    ["Time", date?.isValid ? date.toFormat("HH:mm ZZZZ") + " · UK time" : "To be agreed"],
    [confirmed ? "Location / venue" : "Preferred location", String(payload.location || "To be agreed with you")],
  ];
  if (typeof payload.duration === "number") rows.push(["Photography", `Up to ${payload.duration} minutes · one photographer`]);
  if (price !== null) rows.push(["Package total", money(price)]);
  const payment = deposit !== null && price !== null
    ? `25% deposit: ${money(deposit)}. Remaining balance: ${money(price - deposit)}, due on the session day.`
    : "The remaining balance is due on the session day.";
  const next = confirmed ? "Before we meet" : "What happens next?";
  const nextCopy = confirmed
    ? "Anything you’d like us to know? Reply and we’ll plan the little details together."
    : "We’ll confirm availability and arrange your deposit. You can reply with any questions or extra details.";
  const gallery = "Edited photographs arrive within 14 days in a private online gallery, with high-resolution downloads.";
  const travel = "Leicester travel included. Travel outside Leicester, a second photographer, prints, props, venue fees and other extras are quoted separately.";
  const weather = "If unsuitable weather prevents an outdoor shoot, we’ll agree a new date at no extra charge.";
  const plain = `${brand}\nTwo perspectives. One story.\n\n${title}\n${status}\n\nHello ${payload.name || "there"},\n\n${intro}\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\n${notice}\n${payment}\n\n${next}\n${nextCopy}\n\n${gallery}\n${travel}\n${weather}\n\nWarm wishes,\n${brand}\n${contact}\n\nMoments become chapters.`;
  const tableRows = rows.map(([label, value]) => `<tr><td width="32%" style="padding:7px 0;border-bottom:1px solid #e8e1d6;color:#72685b;font-size:12px;vertical-align:top">${escape(label)}</td><td style="padding:7px 0 7px 10px;border-bottom:1px solid #e8e1d6;color:#29241d;font-size:13px;font-weight:bold;vertical-align:top;overflow-wrap:anywhere">${escape(value)}</td></tr>`).join("");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>@font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:400;src:url('${escape(assetOrigin)}/fonts/BarlowCondensed-Regular.ttf') format('truetype')}@font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:700;src:url('${escape(assetOrigin)}/fonts/BarlowCondensed-Bold.ttf') format('truetype')}</style></head>
<body style="margin:0;padding:0;background:#f1ece3;font-family:Arial,Helvetica,sans-serif;color:#29241d">
<div style="display:none;font-size:1px;color:#f1ece3;max-height:0;overflow:hidden">${escape(title)}. ${confirmed ? "Your next chapter starts here." : "We’ll be in touch to confirm availability."}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1ece3"><tr><td align="center" style="padding:16px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdfa;border:1px solid #e0d6c5;border-radius:12px;overflow:hidden">
<tr><td style="background:#191713;padding:20px 20px 0;text-align:center">
<p style="margin:0 0 5px;color:#c8ad7f;font-size:9px;letter-spacing:2px">PHOTOGRAPHY · LEICESTER</p>
<p style="margin:0;color:#f2ede4;font-family:${headingFont};font-weight:700;font-size:34px;line-height:1.1;text-transform:uppercase">${escape(brand)}</p>
<p style="margin:8px 0 0;color:#d3c4aa;font-size:11px">Two perspectives. One story.</p>
</td></tr><tr><td bgcolor="#191713" style="border-bottom:2px solid #c8ad7f"><img src="${escape(assetOrigin)}/email/chapter-header.png" width="560" alt="" role="presentation" style="display:block;width:100%;max-width:560px;height:auto;border:0"></td></tr>
<tr><td style="padding:22px 20px">
<p style="margin:0 0 10px;font-size:9px;letter-spacing:1.5px;font-weight:bold;color:#786039">${confirmed ? "●" : "◷"} ${status}</p>
<h1 style="margin:0 0 14px;font-family:${headingFont};font-weight:700;font-size:32px;line-height:1.05;text-transform:uppercase;color:#29241d">${escape(title)}</h1>
<p style="margin:0 0 6px;font-size:14px;line-height:1.5">Hello ${escape(payload.name || "there")},</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#51483c">${escape(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">${tableRows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#f4eee3;border-left:3px solid #c8ad7f;padding:12px">
<p style="margin:0 0 7px;font-size:12px;line-height:1.5">${escape(notice)}</p><p style="margin:0;font-size:12px;line-height:1.5;font-weight:bold">${escape(payment)}</p></td></tr></table>
<p style="margin:16px 0 12px;font-size:13px;line-height:1.6;color:#51483c">${escape(nextCopy)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#c8ad7f" style="border-radius:6px"><a href="mailto:${escape(contact)}" style="display:inline-block;padding:13px 32px;color:#211a11;font-size:14px;font-weight:bold;text-decoration:none">Reply</a></td></tr></table>
<p style="margin:16px 0 0;font-size:13px;line-height:1.5">Warm wishes,<br><strong>${escape(brand)}</strong></p>
<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid #e8e1d6;color:#72685b;font-size:11px;line-height:1.5">${escape(gallery)}<br><br>${escape(travel)} ${escape(weather)}</p>
</td></tr><tr><td bgcolor="#191713"><img src="${escape(assetOrigin)}/email/chapter-footer.png" width="560" alt="" role="presentation" style="display:block;width:100%;max-width:560px;height:auto;border:0"></td></tr><tr><td style="padding:0 20px 20px;background:#191713;text-align:center"><p style="margin:0 0 8px;font-family:${headingFont};font-weight:700;color:#c8ad7f;font-size:24px;text-transform:uppercase">Moments become chapters.</p><a href="mailto:${escape(contact)}" style="color:#e4d8c4;font-size:11px;text-decoration:none;overflow-wrap:anywhere">${escape(contact)}</a></td></tr>
</table></td></tr></table></body></html>`;
  return { title, plain, html };
}
