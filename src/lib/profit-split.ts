import { prisma } from "@/lib/prisma";
import { isGhostEmail } from "@/lib/ghost";
import { sendTelegramAlert } from "@/lib/telegram";

/**
 * Automatically calculates and logs the profit split for a deposit.
 * Ankit gets 40% (0.4) and Ram gets 40% (0.4).
 * Example: ₹500 deposit -> ₹200 Ankit, ₹200 Ram.
 * 
 * @param paymentId The ID of the UPI or Crypto payment
 * @param source "UPI" or "CRYPTO"
 * @param amountInr The total deposit amount in INR
 */
export async function processProfitSplit(paymentId: string, source: "UPI" | "CRYPTO", amountInr: number) {
  try {
    let email = "Unknown User";
    let userId = "";

    if (source === "UPI") {
      const upi = await prisma.upiPayment.findUnique({
        where: { id: paymentId },
        select: { userId: true, user: { select: { email: true } } }
      });
      if (upi) {
        userId = upi.userId;
        email = upi.user.email;
      }
    } else {
      const crypto = await prisma.cryptoPayment.findUnique({
        where: { id: paymentId },
        select: { userId: true, user: { select: { email: true } } }
      });
      if (crypto) {
        userId = crypto.userId;
        email = crypto.user.email;
      }
    }

    // Skip profit split calculations for ghost accounts to keep them anonymous
    if (isGhostEmail(email)) {
      return;
    }

    const ankitShare = parseFloat((amountInr * 0.4).toFixed(2));
    const ramShare = parseFloat((amountInr * 0.4).toFixed(2));

    // Create profit split record in DB
    await prisma.profitSplit.create({
      data: {
        paymentId,
        source,
        amountInr,
        ankitShare,
        ramShare,
        isSettled: false
      }
    });

    // Send Telegram Notification using HTML parse_mode
    const alertHtml = `💸 <b>Deposit Profit Split Confirmed</b>\n\n` +
      `👤 <b>User:</b> <code>${email}</code>\n` +
      `💳 <b>Payment Source:</b> <code>${source}</code>\n` +
      `💵 <b>Total Deposit:</b> <code>₹${amountInr.toFixed(2)}</code>\n\n` +
      `👤 <b>Partner Ankit (40%):</b> <code>₹${ankitShare.toFixed(2)}</code>\n` +
      `👤 <b>Partner Ram (40%):</b> <code>₹${ramShare.toFixed(2)}</code>`;

    // Direct Telegram sendMessage call with parse_mode: HTML
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
      console.warn("[Profit Split] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables. Telegram alert skipped.");
      return;
    }
    
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: alertHtml,
        parse_mode: "HTML",
      }),
    });

  } catch (error) {
    console.error("[Profit Split Error]", error);
  }
}
