
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateUser() {
  const sniper = await prisma.user.findUnique({
    where: { email: 'lordsniper716@gmail.com' },
    include: {
      upiPayments: true,
      cryptoPayments: true,
      orders: { select: { id: true, priceCharged: true, status: true, createdAt: true } },
      auditLogs: true
    }
  });

  const allUpiByEmail = await prisma.upiPayment.findMany({
    where: { user: { email: 'lordsniper716@gmail.com' } }
  });

  console.log(JSON.stringify({
    user: {
      id: sniper?.id,
      email: sniper?.email,
      name: sniper?.name,
      balance: sniper?.balance,
      bonusBalance: sniper?.bonusBalance,
      createdAt: sniper?.createdAt
    },
    upiPayments: sniper?.upiPayments,
    cryptoPayments: sniper?.cryptoPayments,
    ordersCount: sniper?.orders?.length,
    ordersTotalCharged: sniper?.orders?.reduce((a, b) => a + b.priceCharged, 0),
    auditLogs: sniper?.auditLogs
  }, null, 2));

  await prisma.$disconnect();
}

investigateUser().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
