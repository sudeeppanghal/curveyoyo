import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  console.log("Starting backfill of ProfitSplit...");

  // Get all existing profit splits to avoid duplicates
  const existingSplits = await prisma.profitSplit.findMany();
  const existingPaymentIds = new Set(existingSplits.map(s => s.paymentId).filter(Boolean));

  // 1. Fetch all confirmed UPI payments
  const upiPayments = await prisma.upiPayment.findMany({
    where: { status: 'CONFIRMED' }
  });

  let added = 0;

  for (const upi of upiPayments) {
    if (existingPaymentIds.has(upi.id)) continue;
    
    const ankitShare = parseFloat((upi.amount * 0.4).toFixed(2));
    const ramShare = parseFloat((upi.amount * 0.4).toFixed(2));
    
    await prisma.profitSplit.create({
      data: {
        paymentId: upi.id,
        source: 'UPI',
        amountInr: upi.amount,
        ankitShare,
        ramShare,
        createdAt: upi.createdAt,
      }
    });
    added++;
  }

  // 2. Fetch all confirmed Crypto payments
  // Since we don't have amountInr on the crypto payment itself, we can either
  // use the AuditLog, or estimate it from the current price. Let's try AuditLog.
  const cryptoPayments = await prisma.cryptoPayment.findMany({
    where: { status: 'CONFIRMED' }
  });

  for (const crypto of cryptoPayments) {
    if (existingPaymentIds.has(crypto.id)) continue;

    // Try to find the audit log for this crypto payment
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'CRYPTO_DEPOSIT_APPROVED',
        userId: crypto.userId,
      },
      orderBy: { createdAt: 'desc' }
    });

    let amountInr = 0;
    if (auditLog && auditLog.metadata && (auditLog.metadata as any).amountInr) {
       amountInr = (auditLog.metadata as any).amountInr;
    } else {
       // fallback: amountUsdt * 90
       amountInr = (crypto.amountUsdt || 0) * 90;
    }

    if (amountInr > 0) {
      const ankitShare = parseFloat((amountInr * 0.4).toFixed(2));
      const ramShare = parseFloat((amountInr * 0.4).toFixed(2));

      await prisma.profitSplit.create({
        data: {
          paymentId: crypto.id,
          source: 'CRYPTO',
          amountInr,
          ankitShare,
          ramShare,
          createdAt: crypto.createdAt,
        }
      });
      added++;
    }
  }

  console.log(`Backfill complete. Added ${added} records.`);
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
