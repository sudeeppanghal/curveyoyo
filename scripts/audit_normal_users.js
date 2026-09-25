
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
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

  const auditReport = [];

  for (const user of users) {
    const totalUpi = user.upiPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalCrypto = user.cryptoPayments.reduce((acc, p) => acc + (p.amountUsdt || 0), 0);
    const totalDeposited = totalUpi + totalCrypto;

    const totalOrdersPlacedCost = user.orders.reduce((acc, o) => acc + (o.priceCharged || 0), 0);
    
    // Group orders by status
    const ordersByStatus = {};
    for (const o of user.orders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + (o.priceCharged || 0);
    }

    // Sum refunds from audit logs
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

    // Actual Net Spent = Total Orders Placed - Total Refunds
    const actualNetSpent = Math.max(0, totalOrdersPlacedCost - totalRefunds);
    
    // Expected Balance = Total Deposited + Total Refunds + Manual Adjustments - Total Orders Placed
    const expectedBalance = totalDeposited + totalRefunds + manualAdjustments - totalOrdersPlacedCost;
    const balanceDiscrepancy = (user.balance - expectedBalance);

    auditReport.push({
      id: user.id,
      email: user.email,
      name: user.name || 'N/A',
      createdAt: user.createdAt,
      recordedBalance: user.balance,
      recordedBonusBalance: user.bonusBalance,
      totalDeposited,
      totalUpi,
      totalCrypto,
      totalOrdersCount: user.orders.length,
      totalOrdersPlacedCost,
      ordersByStatus,
      totalRefunds,
      actualNetSpent,
      expectedBalance: parseFloat(expectedBalance.toFixed(2)),
      balanceDiscrepancy: parseFloat(balanceDiscrepancy.toFixed(2))
    });
  }

  console.log(JSON.stringify(auditReport, null, 2));
  await prisma.$disconnect();
}

runAudit().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
