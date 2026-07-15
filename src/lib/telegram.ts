/**
 * Telegram notification helper for admin alerts.
 */

export async function sendTelegramAlert(text: string, reply_markup?: any): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.warn("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables");
      return false;
    }

    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    };

    if (reply_markup) {
      body.reply_markup = reply_markup;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("[Telegram Alert Failed]", data.description);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Telegram Error]", err);
    return false;
  }
}
