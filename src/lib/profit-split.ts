import { prisma } from "@/lib/prisma";

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
    const ankitShare = amountInr * 0.40;
    const ramShare = amountInr * 0.40;

    await prisma.profitSplit.create({
      data: {
        paymentId,
        source,
        amountInr,
        ankitShare,
        ramShare,
      },
    });

    console.log(`[Profit Split] Recorded for ${source} payment ${paymentId}: Ankit ₹${ankitShare}, Ram ₹${ramShare}`);
  } catch (err) {
    console.error("[Profit Split Error] Failed to record profit split:", err);
  }
}
