
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runScreenshotAudit() {
  const users = await prisma.user.findMany({
    orderBy: { balance: 'desc' },
    include: {
      orders: {
        select: {
          id: true,
          priceCharged: true,
          status: true,
          createdAt: true
        }
      },
      upiPayments: {
        where: { status: 'CONFIRMED' },
        select: { id: true, amount: true, createdAt: true }
      },
      cryptoPayments: {
        where: { status: 'CONFIRMED' },
        select: { id: true, amountUsdt: true, createdAt: true }
      },
      auditLogs: {
        where: {
          action: {
            in: ['ORDER_MIDWAY_REFUND', 'BATCH_FAILED_REFUND', 'ADMIN_UPDATE_BALANCE', 'MANUAL_BALANCE_CREDIT']
          }
        },
        select: { id: true, action: true, metadata: true, createdAt: true }
      }
    }
  });

  console.log(`TOTAL_USERS_IN_LIVE_DB: ${users.length}`);

  const auditedUsers = users.map(user => {
    const totalUpi = user.upiPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalCryptoUsdt = user.cryptoPayments.reduce((acc, p) => acc + (p.amountUsdt || 0), 0);
    const totalCryptoInr = totalCryptoUsdt * 90; // USDT to INR approx rate
    const totalDeposited = totalUpi + totalCryptoInr;

    const totalOrdersPlacedCost = user.orders.reduce((acc, o) => acc + (o.priceCharged || 0), 0);

    let totalRefunds = 0;
    let manualAdjustments = 0;

    for (const log of user.auditLogs) {
      const meta = log.metadata || {};
      if (log.action === 'ORDER_MIDWAY_REFUND' || log.action === 'BATCH_FAILED_REFUND') {
        totalRefunds += parseFloat(meta.refundAmount || 0);
      } else if (log.action === 'ADMIN_UPDATE_BALANCE' || log.action === 'MANUAL_BALANCE_CREDIT') {
        manualAdjustments += parseFloat(meta.amount || meta.credit || 0);
      }
    }

    const actualNetSpent = Math.max(0, totalOrdersPlacedCost - totalRefunds);
    const expectedBalance = totalDeposited + totalRefunds + manualAdjustments - totalOrdersPlacedCost;
    const balanceDiscrepancy = user.balance - expectedBalance;

    return {
      id: user.id,
      email: user.email,
      name: user.name || 'N/A',
      createdAt: user.createdAt,
      walletMode: user.walletMode,
      recordedBalance: parseFloat(user.balance.toFixed(2)),
      bonusBalance: parseFloat(user.bonusBalance.toFixed(2)),
      totalUpi: parseFloat(totalUpi.toFixed(2)),
      totalCryptoUsdt: parseFloat(totalCryptoUsdt.toFixed(2)),
      totalDepositedInr: parseFloat(totalDeposited.toFixed(2)),
      ordersCount: user.orders.length,
      grossOrdersCost: parseFloat(totalOrdersPlacedCost.toFixed(2)),
      totalRefunds: parseFloat(totalRefunds.toFixed(2)),
      actualNetSpent: parseFloat(actualNetSpent.toFixed(2)),
      expectedBalance: parseFloat(expectedBalance.toFixed(2)),
      discrepancy: parseFloat(balanceDiscrepancy.toFixed(2))
    };
  });

  console.log(JSON.stringify(auditedUsers, null, 2));
  await prisma.$disconnect();
}

runScreenshotAudit().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
