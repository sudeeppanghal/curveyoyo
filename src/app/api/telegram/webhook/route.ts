import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAffiliateCommission } from "@/lib/affiliate";
import { processProfitSplit } from "@/lib/profit-split";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7880552291:AAGad9XL6ZeilBxFheCbZKALEzy9elpY6H4";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.ADMIN_SECRET;

export async function POST(request: NextRequest) {
  // 1. Verify Secret Token
  const reqSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (reqSecret !== SECRET) {
    console.warn("[Telegram Webhook] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // We only care about callback queries (inline button clicks)
    if (!body.callback_query) {
      return NextResponse.json({ ok: true });
    }

    const { id: callbackId, data, message, from } = body.callback_query;
    if (!data) return NextResponse.json({ ok: true });

    const chatId = message?.chat?.id;
    const messageId = message?.message_id;
    const adminName = from?.first_name || "Admin";

    let responseText = "Action completed.";
    let finalMessageText = message?.text || "";

    // ── PROCESS ACTIONS ──
    if (data.startsWith("approve_upi_")) {
      const paymentId = data.replace("approve_upi_", "");
      const payment = await prisma.upiPayment.findUnique({ where: { id: paymentId } });
      
      if (!payment || payment.status !== "PENDING") {
        responseText = "Payment not found or already processed.";
      } else {
        await prisma.$transaction([
          prisma.upiPayment.update({ where: { id: payment.id }, data: { status: "CONFIRMED" } }),
          prisma.user.update({
            where: { id: payment.userId },
            data: { balance: { increment: payment.amount } }
          }),
          prisma.auditLog.create({
            data: {
              userId: payment.userId,
              action: "UPI_DEPOSIT_APPROVED",
              metadata: { paymentId: payment.id, amount: payment.amount, source: "Telegram Webhook", adminName },
            }
          })
        ]);
        
        await processAffiliateCommission(payment.userId, payment.amount);
        await processProfitSplit(payment.id, "UPI", payment.amount);
        
        responseText = "✅ UPI Deposit Approved!";
        finalMessageText += `\n\n✅ Approved by ${adminName}`;
      }
    } 
    else if (data.startsWith("reject_upi_")) {
      const paymentId = data.replace("reject_upi_", "");
      const payment = await prisma.upiPayment.findUnique({ where: { id: paymentId } });
      
      if (!payment || payment.status !== "PENDING") {
        responseText = "Payment not found or already processed.";
      } else {
        await prisma.upiPayment.update({ where: { id: payment.id }, data: { status: "REJECTED", rejectedReason: "Rejected by admin via Telegram" } });
        responseText = "❌ UPI Deposit Rejected!";
        finalMessageText += `\n\n❌ Rejected by ${adminName}`;
      }
    }
    else if (data.startsWith("approve_crypto_")) {
      const paymentId = data.replace("approve_crypto_", "");
      const payment = await prisma.cryptoPayment.findUnique({ where: { id: paymentId } });

      if (!payment || payment.status !== "PENDING") {
        responseText = "Payment not found or already processed.";
      } else {
        const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
        const exchangeRate = settings?.priceUsdt || 90;
        const amountUsdt = payment.amountUsdt || 0;
        const amountInr = amountUsdt * exchangeRate;

        await prisma.$transaction([
          prisma.cryptoPayment.update({ where: { id: payment.id }, data: { status: "CONFIRMED" } }),
          prisma.user.update({
            where: { id: payment.userId },
            data: { balance: { increment: amountInr } }
          }),
          prisma.auditLog.create({
            data: {
              userId: payment.userId,
              action: "CRYPTO_DEPOSIT_APPROVED",
              metadata: { paymentId: payment.id, amountInr, amountUsdt, source: "Telegram Webhook", adminName },
            }
          })
        ]);
        
        await processAffiliateCommission(payment.userId, amountInr);
        await processProfitSplit(payment.id, "CRYPTO", amountInr);
        
        responseText = "✅ Crypto Deposit Approved!";
        finalMessageText += `\n\n✅ Approved by ${adminName}`;
      }
    }
    else if (data.startsWith("reject_crypto_")) {
      const paymentId = data.replace("reject_crypto_", "");
      const payment = await prisma.cryptoPayment.findUnique({ where: { id: paymentId } });

      if (!payment || payment.status !== "PENDING") {
        responseText = "Payment not found or already processed.";
      } else {
        await prisma.cryptoPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
        responseText = "❌ Crypto Deposit Rejected!";
        finalMessageText += `\n\n❌ Rejected by ${adminName}`;
      }
    }

    // 2. Answer the callback query to remove the loading state on the button
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId, text: responseText, show_alert: true }),
    });

    // 3. Edit the original message to remove buttons and append status
    if (chatId && messageId && finalMessageText !== message?.text) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: finalMessageText,
          reply_markup: { inline_keyboard: [] } // Remove buttons
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram Webhook Error]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
