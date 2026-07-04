/**
 * Telegram notification helper for admin alerts.
 */

const DEFAULT_BOT_TOKEN = "7880552291:AAGad9XL6ZeilBxFheCbZKALEzy9elpY6H4";
const DEFAULT_CHAT_ID = "-1003769347099";

export async function sendTelegramAlert(text: string, reply_markup?: any): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;

    if (!token || !chatId) {
      console.warn("[Telegram] Missing BOT_TOKEN or CHAT_ID");
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
