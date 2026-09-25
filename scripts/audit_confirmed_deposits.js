
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditConfirmedDeposits() {
  const settings = await prisma.adminSettings.findUnique({ where: { id: 'global' } });
  const usdtRate = settings?.priceUsdt || 96;

  // 1. Confirmed UPI Payments
  const confirmedUpi = await prisma.upiPayment.findMany({
    where: { status: 'CONFIRMED' },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } }
  });

  // 2. Confirmed Crypto Payments
  const confirmedCrypto = await prisma.cryptoPayment.findMany({
    where: { status: 'CONFIRMED' },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } }
  });

  let totalUpiInr = 0;
  const upiList = confirmedUpi.map((p, index) => {
    totalUpiInr += (p.amount || 0);
    return {
      index: index + 1,
      id: p.id,
      utr: p.utr,
      userName: p.user?.name || 'N/A',
      userEmail: p.user?.email || 'N/A',
      amountInr: p.amount,
      createdAt: p.createdAt
    };
  });

  let totalCryptoUsdt = 0;
  let totalCryptoInr = 0;
  const cryptoList = confirmedCrypto.map((p, index) => {
    const inrValue = Math.round((p.amountUsdt || 0) * usdtRate);
    totalCryptoUsdt += (p.amountUsdt || 0);
    totalCryptoInr += inrValue;
    return {
      index: index + 1,
      id: p.id,
      network: p.network,
      txHash: p.txHash,
      userName: p.user?.name || 'N/A',
      userEmail: p.user?.email || 'N/A',
      amountUsdt: p.amountUsdt,
      convertedInr: inrValue,
      verifiedAt: p.verifiedAt || p.createdAt
    };
  });

  console.log(JSON.stringify({
    usdtExchangeRateUsed: usdtRate,
    upiSummary: {
      count: upiList.length,
      totalAmountInr: parseFloat(totalUpiInr.toFixed(2))
    },
    cryptoSummary: {
      count: cryptoList.length,
      totalAmountUsdt: parseFloat(totalCryptoUsdt.toFixed(2)),
      totalAmountInr: parseFloat(totalCryptoInr.toFixed(2))
    },
    grandTotalConfirmedInr: parseFloat((totalUpiInr + totalCryptoInr).toFixed(2)),
    upiList,
    cryptoList
  }, null, 2));

  await prisma.$disconnect();
}

auditConfirmedDeposits().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
