
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDashboardTotals() {
  const settings = await prisma.adminSettings.findUnique({ where: { id: 'global' } });
  const usdtRate = settings?.priceUsdt || 90;

  // 1. ProfitSplit sum
  const profitAgg = await prisma.profitSplit.aggregate({
    _sum: { amountInr: true, ankitShare: true, ramShare: true }
  });

  // 2. All UPI Payments (Confirmed)
  const allUpi = await prisma.upiPayment.findMany({
    where: { status: 'CONFIRMED' },
    include: { user: { select: { email: true, name: true } } }
  });

  // 3. All Crypto Payments (Confirmed)
  const allCrypto = await prisma.cryptoPayment.findMany({
    where: { status: 'CONFIRMED' },
    include: { user: { select: { email: true, name: true } } }
  });

  const totalAllUpiInr = allUpi.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalAllCryptoUsdt = allCrypto.reduce((acc, p) => acc + (p.amountUsdt || 0), 0);
  const totalAllCryptoInr = totalAllCryptoUsdt * usdtRate;

  const sumNormalUpi = totalAllUpiInr;
  const sumNormalCryptoUsdt = totalAllCryptoUsdt;

  // Check User table totalDeposited calculation in Admin Users page
  const users = await prisma.user.findMany({
    include: {
      upiPayments: { where: { status: 'CONFIRMED' } },
      cryptoPayments: { where: { status: 'CONFIRMED' } }
    }
  });

  let sumUserTableDeposits = 0;
  for (const u of users) {
    const upi = u.upiPayments.reduce((acc, p) => acc + p.amount, 0);
    const crypto = u.cryptoPayments.reduce((acc, p) => acc + p.amountUsdt * usdtRate, 0);
    sumUserTableDeposits += (upi + crypto);
  }

  console.log(JSON.stringify({
    profitSplitSum: profitAgg._sum.amountInr || 0,
    totalAllUpiInr,
    totalAllCryptoUsdt,
    totalAllCryptoInr,
    grandTotalAllDeposits: totalAllUpiInr + totalAllCryptoInr,
    sumNormalUpi,
    sumNormalCryptoUsdt,
    sumUserTableDeposits,
    allUpiList: allUpi.map(p => ({ email: p.user.email, amount: p.amount, createdAt: p.createdAt })),
    allCryptoList: allCrypto.map(p => ({ email: p.user.email, amountUsdt: p.amountUsdt, createdAt: p.createdAt }))
  }, null, 2));

  await prisma.$disconnect();
}

checkDashboardTotals().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
