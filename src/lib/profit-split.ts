import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { sendDiscordAlert } from "@/lib/discord";

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

    // Send Discord Notification
    const alertMsg = `💸 **Deposit Profit Split Confirmed**\n\n` +
      `👤 **User:** \`${email}\`\n` +
      `💳 **Payment Source:** \`${source}\`\n` +
      `💵 **Total Deposit:** \`₹${amountInr.toFixed(2)}\`\n\n` +
      `👤 **Partner Ankit (40%):** \`₹${ankitShare.toFixed(2)}\`\n` +
      `👤 **Partner Ram (40%):** \`₹${ramShare.toFixed(2)}\``;
    await sendDiscordAlert("billing", alertMsg).catch(console.error);

  } catch (error) {
    console.error("[Profit Split Error]", error);
  }
}
