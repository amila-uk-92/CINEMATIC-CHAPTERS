import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { forwardVisitorMessageToTelegram, isTelegramConfigured } from '@/lib/telegram';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  // Find or create conversation
  let convRes = await query(`SELECT id FROM chat_conversations WHERE visitor_token = $1`, [token]);
  let convId = convRes.rows[0]?.id;

  if (!convId) {
    return NextResponse.json({
      messages: [],
      telegramConfigured: isTelegramConfigured(),
    });
  }

  const msgRes = await query(
    `SELECT id, sender, message_text, created_at FROM chat_messages
     WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [convId]
  );

  return NextResponse.json({
    messages: msgRes.rows,
    telegramConfigured: isTelegramConfigured(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, name, message } = body;

  if (!token || !message) {
    return NextResponse.json({ error: 'Token and message are required' }, { status: 400 });
  }

  // Find or create conversation
  let convRes = await query(`SELECT id FROM chat_conversations WHERE visitor_token = $1`, [token]);
  let convId = convRes.rows[0]?.id;

  if (!convId) {
    convId = 'conv_' + crypto.randomBytes(8).toString('hex');
    await query(
      `INSERT INTO chat_conversations (id, visitor_token, visitor_name) VALUES ($1, $2, $3)`,
      [convId, token, name || 'Visitor']
    );
  }

  // Store message in database
  const msgId = 'msg_' + crypto.randomBytes(8).toString('hex');
  const insertRes = await query(
    `INSERT INTO chat_messages (id, conversation_id, sender, message_text)
     VALUES ($1, $2, 'visitor', $3) RETURNING *`,
    [msgId, convId, message]
  );

  // Deliver to Telegram bot if configured
  await forwardVisitorMessageToTelegram(convId, name, message);

  return NextResponse.json({
    message: insertRes.rows[0],
    telegramConfigured: isTelegramConfigured(),
  });
}
