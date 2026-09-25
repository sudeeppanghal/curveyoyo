
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSummary() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
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

  const activeUsers = [];
  let systemTotalDeposits = 0;
  let systemTotalSpent = 0;
  let systemTotalBalance = 0;

  for (const user of users) {
    const totalUpi = user.upiPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalCrypto = user.cryptoPayments.reduce((acc, p) => acc + (p.amountUsdt || 0), 0);
    const totalDeposited = totalUpi + totalCrypto;

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

    systemTotalDeposits += totalDeposited;
    systemTotalSpent += actualNetSpent;
    systemTotalBalance += user.balance;

    if (totalDeposited > 0 || user.orders.length > 0 || user.balance !== 0 || user.bonusBalance !== 0) {
      activeUsers.push({
        id: user.id,
        email: user.email,
        name: user.name || 'N/A',
        walletMode: user.walletMode,
        recordedBalance: parseFloat(user.balance.toFixed(2)),
        bonusBalance: parseFloat(user.bonusBalance.toFixed(2)),
        totalDeposited: parseFloat(totalDeposited.toFixed(2)),
        ordersCount: user.orders.length,
        totalOrdersGrossCost: parseFloat(totalOrdersPlacedCost.toFixed(2)),
        totalRefunds: parseFloat(totalRefunds.toFixed(2)),
        actualNetSpent: parseFloat(actualNetSpent.toFixed(2)),
        expectedBalance: parseFloat(expectedBalance.toFixed(2)),
        discrepancy: parseFloat(balanceDiscrepancy.toFixed(2))
      });
    }
  }

  console.log(JSON.stringify({
    totalUsersCount: users.length,
    activeUsersCount: activeUsers.length,
    systemTotalDeposits: parseFloat(systemTotalDeposits.toFixed(2)),
    systemTotalSpent: parseFloat(systemTotalSpent.toFixed(2)),
    systemTotalBalance: parseFloat(systemTotalBalance.toFixed(2)),
    activeUsers
  }, null, 2));

  await prisma.$disconnect();
}

runSummary().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
