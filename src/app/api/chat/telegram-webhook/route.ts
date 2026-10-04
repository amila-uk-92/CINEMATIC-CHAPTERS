import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Verify optional webhook secret
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret) {
      const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
      if (headerSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
      }
    }

    const update = await req.json();

    // Look for reply to an existing forwarded message
    const message = update.message;
    if (!message || !message.reply_to_message || !message.text) {
      return NextResponse.json({ ok: true, note: 'Ignored non-reply update' });
    }

    const replyToId = message.reply_to_message.message_id;

    // Check mapping to find conversation
    const mapRes = await query(
      `SELECT conversation_id FROM telegram_message_map WHERE telegram_message_id = $1`,
      [replyToId]
    );

    if (mapRes.rows.length === 0) {
      return NextResponse.json({ ok: true, note: 'No matching website conversation' });
    }

    const convId = mapRes.rows[0].conversation_id;

    // Insert team reply into website conversation
    const msgId = 'msg_' + crypto.randomBytes(8).toString('hex');
    await query(
      `INSERT INTO chat_messages (id, conversation_id, sender, message_text)
       VALUES ($1, $2, 'team', $3)`,
      [msgId, convId, message.text]
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
