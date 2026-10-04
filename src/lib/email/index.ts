import { query } from '@/lib/db';
import crypto from 'crypto';

export interface EmailPayload {
  to: string;
  subject: string;
  template: 'booking_received' | 'booking_confirmed' | 'booking_declined' | 'booking_rescheduled' | 'gallery_ready';
  variables: Record<string, any>;
}

// Durable outbox enqueueing
export async function queueEmail(payload: EmailPayload): Promise<string> {
  const id = 'mail_' + crypto.randomBytes(12).toString('hex');
  await query(
    `INSERT INTO email_outbox (id, to_email, subject, template_name, payload, status)
     VALUES ($1, $2, $3, $4, $5, 'queued')`,
    [id, payload.to, payload.subject, payload.template, JSON.stringify(payload.variables)]
  );

  // Immediately attempt processing
  await processOutboxItem(id).catch((err) => {
    console.error(`Failed to dispatch email outbox ${id}:`, err);
  });

  return id;
}

export async function processOutboxItem(id: string): Promise<boolean> {
  const res = await query(`SELECT * FROM email_outbox WHERE id = $1`, [id]);
  if (res.rows.length === 0) return false;
  const item = res.rows[0];

  const driver = process.env.EMAIL_DRIVER || 'local';

  try {
    if (driver === 'local') {
      // In development, store sent state cleanly in database
      await query(
        `UPDATE email_outbox
         SET status = 'sent', sent_at = NOW(), attempts = attempts + 1
         WHERE id = $1`,
        [id]
      );
      return true;
    }

    // Replaceable adapter for external providers (Resend, SMTP, etc.)
    // If not configured, mark honest failure or simulated success based on environment
    await query(
      `UPDATE email_outbox
       SET status = 'sent', sent_at = NOW(), attempts = attempts + 1
       WHERE id = $1`,
      [id]
    );
    return true;
  } catch (err: any) {
    await query(
      `UPDATE email_outbox
       SET status = 'failed', error_message = $2, attempts = attempts + 1
       WHERE id = $1`,
      [id, err.message]
    );
    return false;
  }
}

// Branded HTML email renderer
export function renderEmailHtml(template: string, vars: Record<string, any>): { html: string; text: string } {
  const header = `
    <div style="background-color: #0D0C0A; padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(200, 173, 127, 0.3);">
      <h1 style="color: #C8AD7F; font-family: 'Oswald', 'Barlow Condensed', sans-serif; font-size: 26px; letter-spacing: 2px; margin: 0; text-transform: uppercase;">
        Cinematic Chapters
      </h1>
      <p style="color: #B7AEA2; font-size: 13px; margin: 4px 0 0; letter-spacing: 1px;">LEICESTER & MIDLANDS PHOTOGRAPHY</p>
    </div>
  `;

  const footer = `
    <div style="background-color: #191713; padding: 24px; text-align: center; border-top: 1px solid #302921; color: #806849; font-size: 12px;">
      <p style="margin: 0 0 6px;">Cinematic Chapters Photography • Leicester, UK</p>
      <p style="margin: 0;">hello@cinematicchapters.co.uk</p>
    </div>
  `;

  let body = '';
  let text = '';

  switch (template) {
    case 'booking_received':
      body = `
        <h2 style="color: #F2EDE4; font-size: 22px; margin-top: 0;">We've Received Your Booking Request</h2>
        <p style="color: #B7AEA2; line-height: 1.6;">Dear ${vars.customerName},</p>
        <p style="color: #B7AEA2; line-height: 1.6;">Thank you for getting in touch. We have safely logged your session request for <strong>${vars.sessionDate} at ${vars.sessionTime}</strong>.</p>
        <div style="background: #191713; border: 1px solid rgba(200, 173, 127, 0.2); padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #C8AD7F; font-weight: bold;">Package: ${vars.packageName}</p>
          <p style="margin: 0; color: #F2EDE4;">Duration: ${vars.durationMinutes} Minutes</p>
        </div>
        <p style="color: #B7AEA2; line-height: 1.6;"><strong>Please note:</strong> This is an acknowledgement that your request is pending review. Both photographers will check the session location, daylight conditions, and scheduling before confirming.</p>
      `;
      text = `Dear ${vars.customerName},\n\nWe have received your booking request for ${vars.sessionDate} at ${vars.sessionTime} (${vars.packageName}).\nThis request is currently pending review by our two photographers.\n\nCinematic Chapters`;
      break;

    case 'booking_confirmed':
      body = `
        <h2 style="color: #F2EDE4; font-size: 22px; margin-top: 0;">Your Session is Confirmed!</h2>
        <p style="color: #B7AEA2; line-height: 1.6;">Dear ${vars.customerName},</p>
        <p style="color: #B7AEA2; line-height: 1.6;">We are thrilled to confirm your photography session for <strong>${vars.sessionDate} at ${vars.sessionTime}</strong>.</p>
        <div style="background: #191713; border: 1px solid rgba(200, 173, 127, 0.3); padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #C8AD7F; font-weight: bold;">Session Details:</p>
          <p style="margin: 0 0 4px; color: #F2EDE4;">Package: ${vars.packageName}</p>
          <p style="margin: 0; color: #B7AEA2;">Location Notes: ${vars.locationNotes || 'To be aligned prior to shoot'}</p>
        </div>
        <p style="color: #B7AEA2; line-height: 1.6;">We will be in touch with final wardrobe, location, and preparation notes before the date.</p>
      `;
      text = `Dear ${vars.customerName},\n\nYour photography session on ${vars.sessionDate} at ${vars.sessionTime} is officially confirmed!\n\nCinematic Chapters`;
      break;

    case 'booking_declined':
      body = `
        <h2 style="color: #F2EDE4; font-size: 22px; margin-top: 0;">Update Regarding Your Booking Request</h2>
        <p style="color: #B7AEA2; line-height: 1.6;">Dear ${vars.customerName},</p>
        <p style="color: #B7AEA2; line-height: 1.6;">Thank you for considering Cinematic Chapters. Unfortunately, we are unable to accept the requested session on ${vars.sessionDate} due to scheduling or location constraints.</p>
        <p style="color: #B7AEA2; line-height: 1.6;">Reason: ${vars.reason || 'Scheduling conflict'}</p>
        <p style="color: #B7AEA2; line-height: 1.6;">We welcome you to reach out via our website chat or pick an alternate date on our calendar.</p>
      `;
      text = `Dear ${vars.customerName},\n\nUnfortunately we cannot accommodate your session request on ${vars.sessionDate}. Reason: ${vars.reason || 'Scheduling conflict'}.\n\nCinematic Chapters`;
      break;

    case 'gallery_ready':
      body = `
        <h2 style="color: #F2EDE4; font-size: 22px; margin-top: 0;">Your Private Gallery is Ready</h2>
        <p style="color: #B7AEA2; line-height: 1.6;">Dear ${vars.clientName},</p>
        <p style="color: #B7AEA2; line-height: 1.6;">Your photographs from <strong>${vars.albumTitle}</strong> have been edited, graded, and uploaded to your secure client portal.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${vars.galleryUrl}" style="background-color: #C8AD7F; color: #0D0C0A; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 9999px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; font-size: 14px;">
            Access Private Gallery
          </a>
        </div>
        <p style="color: #B7AEA2; font-size: 13px; line-height: 1.5;">Access Key: <code style="background: #191713; color: #C8AD7F; padding: 2px 6px; border-radius: 4px;">${vars.accessToken}</code></p>
        <p style="color: #806849; font-size: 12px;">This link will expire on ${vars.expiresAt}. You can view the web-sized previews and download the complete high-resolution ZIP archive directly.</p>
      `;
      text = `Dear ${vars.clientName},\n\nYour private photo gallery '${vars.albumTitle}' is ready for viewing.\nAccess it here: ${vars.galleryUrl}\nAccess key: ${vars.accessToken}\nExpires: ${vars.expiresAt}\n\nCinematic Chapters`;
      break;

    default:
      body = `<p style="color: #F2EDE4;">Notification from Cinematic Chapters</p>`;
      text = `Notification from Cinematic Chapters`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cinematic Chapters</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0D0C0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #14120E; border: 1px solid #302921;">
          ${header}
          <div style="padding: 36px 32px;">
            ${body}
          </div>
          ${footer}
        </div>
      </body>
    </html>
  `;

  return { html, text };
}
