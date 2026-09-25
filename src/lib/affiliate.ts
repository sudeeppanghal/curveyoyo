import { prisma } from "@/lib/prisma";

export async function processAffiliateCommission(userId: string, depositAmount: number) {
  try {
    if (depositAmount <= 0) return;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.referredBy) return;

    const affiliate = await prisma.user.findFirst({
      where: {
        OR: [
          { affiliateCode: user.referredBy },
          { id: user.referredBy },
          { email: user.referredBy }
        ]
      }
    });

    if (!affiliate) return;

    const commission = Number((depositAmount * 0.20).toFixed(2));
    if (commission <= 0) return;

    await prisma.user.update({
      where: { id: affiliate.id },
      data: {
        balance: { increment: commission },
        affiliateEarnings: { increment: commission }
      }
    });

    await prisma.affiliateTransaction.create({
      data: {
        affiliateId: affiliate.id,
        referredUserId: user.id,
        amountDeposit: depositAmount,
        commissionEarned: commission,
        type: "DEPOSIT"
      }
    });

    // Also log in audit
    await prisma.auditLog.create({
      data: {
        userId: affiliate.id,
        action: "AFFILIATE_COMMISSION_PAID",
        metadata: { referredUserId: user.id, depositAmount, commissionEarned: commission }
      }
    }).catch(() => {});
  } catch (err) {
    console.error("[processAffiliateCommission]", err);
  }
}

export async function ensureSpecialAffiliateAccount(email: string, userId: string) {
  try {
    if (email.toLowerCase() === "bizanomarketing.carrd.co@gmail.com") {
      await prisma.user.update({
        where: { id: userId },
        data: { affiliateCode: "BIZANO20" }
      });
    }
  } catch (err) {
    console.error("[ensureSpecialAffiliateAccount]", err);
  }
}
