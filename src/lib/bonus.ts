import { prisma } from "@/lib/prisma";

export async function calculateDepositBonus(params: {
  type: "UPI" | "CRYPTO";
  amountInr: number;
  amountUsdt?: number;
  exchangeRate?: number;
}): Promise<{ bonusAmount: number; bonusPercent: number; announcementId?: string }> {
  const { type, amountInr, amountUsdt, exchangeRate = 90 } = params;

  // 1. Check for active announcement promo offer if configured in database
  const now = new Date();
  const activeOffer = await prisma.announcement.findFirst({
    where: {
      offerEnabled: true,
      endsAt: { gte: now },
      minDeposit: { lte: amountInr }
    }
  });

  let bonusPercent = 0;
  let announcementId: string | undefined = undefined;

  if (activeOffer) {
    bonusPercent = activeOffer.bonusPercent;
    announcementId = activeOffer.id;
  }

  // 2. Automatic 50% Bonus Rule (Applied going forward for new approvals):
  // - UPI deposits >= ₹2000
  // - Crypto / USD deposits >= $20 (USDT or equivalent INR)
  const isEligibleFor50Bonus = 
    (type === "UPI" && amountInr >= 2000) ||
    (type === "CRYPTO" && ((amountUsdt !== undefined && amountUsdt >= 20) || amountInr >= 20 * exchangeRate));

  if (isEligibleFor50Bonus && bonusPercent < 50) {
    bonusPercent = 50;
  }

  const bonusAmount = amountInr * (bonusPercent / 100);

  return {
    bonusAmount,
    bonusPercent,
    announcementId
  };
}
