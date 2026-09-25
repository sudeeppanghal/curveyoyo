
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sumColumn() {
  const users = await prisma.user.findMany({
    include: {
      upiPayments: { where: { status: 'CONFIRMED' } },
      cryptoPayments: { where: { status: 'CONFIRMED' } }
    }
  });

  const upiGroup = await prisma.upiPayment.groupBy({
    by: ['userId'],
    _sum: { amount: true },
    where: { status: 'CONFIRMED' }
  });

  const cryptoGroup = await prisma.cryptoPayment.groupBy({
    by: ['userId'],
    _sum: { amountUsdt: true },
    where: { status: 'CONFIRMED' }
  });

  const upiMap = new Map(upiGroup.map(g => [g.userId, g._sum.amount || 0]));
  const cryptoMap = new Map(cryptoGroup.map(g => [g.userId, g._sum.amountUsdt || 0]));

  let sumDepositedInrColumn = 0;
  let sumDepositedUsdtColumn = 0;

  for (const user of users) {
    const upi = upiMap.get(user.id) || 0;
    const crypto = cryptoMap.get(user.id) || 0;
    sumDepositedInrColumn += upi;
    sumDepositedUsdtColumn += crypto;
  }

  const grandTotalWithUsdt96 = sumDepositedInrColumn + (sumDepositedUsdtColumn * 96);
  const grandTotalWithUsdt90 = sumDepositedInrColumn + (sumDepositedUsdtColumn * 90);

  console.log(JSON.stringify({
    totalUsersCount: users.length,
    sumDepositedInrColumn,
    sumDepositedUsdtColumn,
    grandTotalWithUsdt96,
    grandTotalWithUsdt90
  }, null, 2));

  await prisma.$disconnect();
}

sumColumn().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
