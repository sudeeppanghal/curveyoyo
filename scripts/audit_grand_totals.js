
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runGrandTotals() {
  const normalUsers = await prisma.user.findMany({
    include: {
      orders: {
        select: { id: true, priceCharged: true, status: true }
      },
      upiPayments: {
        where: { status: 'CONFIRMED' },
        select: { id: true, amount: true }
      },
      cryptoPayments: {
        where: { status: 'CONFIRMED' },
        select: { id: true, amountUsdt: true }
      },
      auditLogs: {
        where: {
          action: {
            in: ['ORDER_MIDWAY_REFUND', 'BATCH_FAILED_REFUND', 'ADMIN_UPDATE_BALANCE', 'MANUAL_BALANCE_CREDIT']
          }
        },
        select: { id: true, action: true, metadata: true }
      }
    }
  });

  const settings = await prisma.adminSettings.findUnique({ where: { id: 'global' } });
  const usdtRate = settings?.priceUsdt || 90;

  let totalNormalUsers = normalUsers.length;
  let totalDepositedUpiInr = 0;
  let totalDepositedCryptoUsdt = 0;
  let totalDepositedCryptoInr = 0;
  let totalGrossOrdersCost = 0;
  let totalOrdersCount = 0;
  let totalRefundsCredited = 0;
  let totalManualAdminCredits = 0;
  let totalCurrentRecordedBalances = 0;

  for (const user of normalUsers) {
    const userUpi = user.upiPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const userCryptoUsdt = user.cryptoPayments.reduce((acc, p) => acc + (p.amountUsdt || 0), 0);
    const userCryptoInr = userCryptoUsdt * usdtRate;

    totalDepositedUpiInr += userUpi;
    totalDepositedCryptoUsdt += userCryptoUsdt;
    totalDepositedCryptoInr += userCryptoInr;

    const userOrdersCost = user.orders.reduce((acc, o) => acc + (o.priceCharged || 0), 0);
    totalGrossOrdersCost += userOrdersCost;
    totalOrdersCount += user.orders.length;

    for (const log of user.auditLogs) {
      const meta = log.metadata || {};
      if (log.action === 'ORDER_MIDWAY_REFUND' || log.action === 'BATCH_FAILED_REFUND') {
        totalRefundsCredited += parseFloat(meta.refundAmount || 0);
      } else if (log.action === 'ADMIN_UPDATE_BALANCE' || log.action === 'MANUAL_BALANCE_CREDIT') {
        totalManualAdminCredits += parseFloat(meta.amount || meta.credit || 0);
      }
    }

    totalCurrentRecordedBalances += user.balance;
  }

  const grandTotalDepositsInr = totalDepositedUpiInr + totalDepositedCryptoInr;
  const grandTotalActualNetSpent = Math.max(0, totalGrossOrdersCost - totalRefundsCredited);

  console.log(JSON.stringify({
    usdtExchangeRateUsed: usdtRate,
    totalNormalUsers,
    totalOrdersCount,
    totalDepositedUpiInr: parseFloat(totalDepositedUpiInr.toFixed(2)),
    totalDepositedCryptoUsdt: parseFloat(totalDepositedCryptoUsdt.toFixed(2)),
    totalDepositedCryptoInr: parseFloat(totalDepositedCryptoInr.toFixed(2)),
    grandTotalDepositsInr: parseFloat(grandTotalDepositsInr.toFixed(2)),
    totalGrossOrdersCost: parseFloat(totalGrossOrdersCost.toFixed(2)),
    totalRefundsCredited: parseFloat(totalRefundsCredited.toFixed(2)),
    totalManualAdminCredits: parseFloat(totalManualAdminCredits.toFixed(2)),
    grandTotalActualNetSpent: parseFloat(grandTotalActualNetSpent.toFixed(2)),
    totalCurrentRecordedBalances: parseFloat(totalCurrentRecordedBalances.toFixed(2))
  }, null, 2));

  await prisma.$disconnect();
}

runGrandTotals().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
