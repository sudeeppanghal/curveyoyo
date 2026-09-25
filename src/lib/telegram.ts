/**
 * Telegram alert shim — all calls are transparently forwarded to Discord.
 *
 * The old Telegram integration has been fully replaced by Discord webhooks.
 * This file exists purely for backward compatibility so that all existing
 * call sites (auto-sync, orders, billing, tickets, etc.) continue to work
 * without any code changes — they just end up posting to the correct Discord
 * channel instead.
 *
 * Channel routing (inferred from message content):
 *   💰 UPI/USDT/deposit keywords → billing channel
 *   🎫 Ticket/Support keywords   → tickets channel
 *   📦 Order/Campaign keywords   → orders channel
 *   everything else              → system channel
 */

import { sendDiscordAlert, type DiscordAlertType } from "@/lib/discord";

function inferChannel(text: string): DiscordAlertType {
  const t = text.toLowerCase();
  if (/order|campaign|deliver|view|like|save|share|comment|auto-order/i.test(t)) return "orders";
  if (/upi|usdt|deposit|payment|crypto|wallet|balance|fund/i.test(t)) return "billing";
  if (/ticket|support|reply|message/i.test(t))                          return "tickets";
  return "system";
}

export async function sendTelegramAlert(text: string, _reply_markup?: any): Promise<boolean> {
  // Convert Telegram-style *bold* to Discord-style **bold** formatting
  const discordText = text.replace(/((?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*))/g, "**$2**");
  return sendDiscordAlert(inferChannel(text), discordText).catch(() => false);
}
