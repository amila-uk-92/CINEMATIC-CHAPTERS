import { query } from '@/lib/db';

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function forwardVisitorMessageToTelegram(conversationId: string, visitorName: string | null, messageText: string) {
  if (!isTelegramConfigured()) {
    console.log('[Telegram Integration] Not configured. Storing in database only.');
    return null;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_CHAT_ID!;

  const senderLabel = visitorName ? `${visitorName} (${conversationId.slice(0, 8)})` : `Visitor #${conversationId.slice(0, 8)}`;
  const text = `💬 *New Message from Website Chat*\n👤 *From:* ${senderLabel}\n\n${messageText}\n\n_Reply directly to this Telegram message to respond to the visitor._`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();
    if (data.ok && data.result?.message_id) {
      const msgId = data.result.message_id;
      // Record mapping so team Telegram replies route back to this conversation
      await query(
        `INSERT INTO telegram_message_map (id, telegram_message_id, conversation_id)
         VALUES ($1, $2, $3)`,
        [`tg_${Date.now()}_${msgId}`, msgId, conversationId]
      );
      return msgId;
    }
  } catch (err) {
    console.error('[Telegram Integration] Error sending to Telegram:', err);
  }
  return null;
}
