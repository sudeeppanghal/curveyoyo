
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepAudit() {
  // 1. Audit logs for manual balance changes
  const balanceAuditLogs = await prisma.auditLog.findMany({
    where: {
      action: { in: ['UPDATE_BALANCE', 'UPDATE_BONUS_BALANCE', 'MANUAL_DEPOSIT', 'ADMIN_BALANCE_ADD'] }
    },
    include: { user: { select: { email: true } } }
  });

  // 2. All audit log action types in the database
  const actionTypes = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: { id: true }
  });

  // 3. Check Affiliate Transactions
  const affiliateTx = await prisma.affiliateTransaction.findMany();

  // 4. Check Subscriptions
  const subscriptions = await prisma.subscription.findMany();

  // 5. Check Profit Splits
  const profitSplits = await prisma.profitSplit.findMany();
  const sumProfitSplitsInr = profitSplits.reduce((a, b) => a + (b.amountInr || 0), 0);

  // 6. Check total spending on orders per user
  const ordersGrouped = await prisma.order.groupBy({
    by: ['userId'],
    _sum: { priceCharged: true }
  });

  // 7. Check if total order cost across all users is ~61,793
  const totalOrderPriceAll = ordersGrouped.reduce((a, b) => a + (b._sum.priceCharged || 0), 0);

  // 8. Find users whose spent + current balance exceeds their confirmed deposits
  const users = await prisma.user.findMany({
    include: {
      upiPayments: { where: { status: 'CONFIRMED' } },
      cryptoPayments: { where: { status: 'CONFIRMED' } },
      orders: true
    }
  });

  let usersWithExtraFunds = [];
  let totalExtraFundsCredited = 0;

  for (const u of users) {
    const upiConfirmed = u.upiPayments.reduce((a, b) => a + b.amount, 0);
    const cryptoConfirmed = u.cryptoPayments.reduce((a, b) => a + b.amountUsdt * 96, 0);
    const totalConfirmedDeposit = upiConfirmed + cryptoConfirmed;

    const totalOrdersGross = u.orders.reduce((a, b) => a + b.priceCharged, 0);

    if (totalOrdersGross > totalConfirmedDeposit) {
      usersWithExtraFunds.push({
        email: u.email,
        confirmedDeposit: totalConfirmedDeposit,
        totalOrdersGross,
        currentBalance: u.balance,
        diff: totalOrdersGross - totalConfirmedDeposit
      });
      totalExtraFundsCredited += (totalOrdersGross - totalConfirmedDeposit);
    }
  }

  console.log(JSON.stringify({
    actionTypes,
    balanceAuditLogsCount: balanceAuditLogs.length,
    balanceAuditLogs: balanceAuditLogs.slice(0, 10),
    affiliateTxCount: affiliateTx.length,
    subscriptionsCount: subscriptions.length,
    sumProfitSplitsInr,
    totalOrderPriceAll,
    usersWithExtraFundsCount: usersWithExtraFunds.length,
    totalExtraFundsCredited,
    topUsersWithExtraFunds: usersWithExtraFunds.sort((a,b) => b.diff - a.diff).slice(0, 15)
  }, null, 2));

  await prisma.$disconnect();
}

deepAudit().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
