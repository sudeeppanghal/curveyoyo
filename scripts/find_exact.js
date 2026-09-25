
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findExact79969() {
  const users = await prisma.user.findMany({
    include: {
      upiPayments: true,
      cryptoPayments: true,
      orders: true
    }
  });

  // Formula A: sum upi (all statuses) + sum crypto * 96 (all statuses)
  let sumAllStatus = 0;
  for (const u of users) {
    const upi = u.upiPayments.reduce((a, b) => a + b.amount, 0);
    const crypto = u.cryptoPayments.reduce((a, b) => a + b.amountUsdt * 96, 0);
    sumAllStatus += (upi + crypto);
  }

  // Formula B: sum upi (all statuses) + sum crypto * 90 (all statuses)
  let sumAllStatus90 = 0;
  for (const u of users) {
    const upi = u.upiPayments.reduce((a, b) => a + b.amount, 0);
    const crypto = u.cryptoPayments.reduce((a, b) => a + b.amountUsdt * 90, 0);
    sumAllStatus90 += (upi + crypto);
  }

  // Formula C: sum of user order prices + recorded balances
  let sumOrderAndBalance = 0;
  for (const u of users) {
    const orders = u.orders.reduce((a, b) => a + b.priceCharged, 0);
    sumOrderAndBalance += (orders + u.balance);
  }

  console.log(JSON.stringify({
    sumAllStatus,
    sumAllStatus90,
    sumOrderAndBalance
  }, null, 2));

  await prisma.$disconnect();
}

findExact79969().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
