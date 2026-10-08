/**
 * Telegram Notification Utility
 * Handles sending messages to the Telegram Bot API
 */

export const sendTelegramMessage = async (env, message) => {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram notifications skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing.');
    return { success: false, error: 'Configuration missing' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
    return { success: false, error: err.message };
  }
};
