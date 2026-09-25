
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function find79969() {
  const upiAllStatus = await prisma.upiPayment.aggregate({
    _sum: { amount: true }
  });

  const cryptoAllStatus = await prisma.cryptoPayment.aggregate({
    _sum: { amountUsdt: true }
  });

  const userBalanceSum = await prisma.user.aggregate({
    _sum: { balance: true }
  });

  const orderPriceSum = await prisma.order.aggregate({
    _sum: { priceCharged: true }
  });

  const upiConfirmed = await prisma.upiPayment.aggregate({
    where: { status: 'CONFIRMED' },
    _sum: { amount: true }
  });

  const upiPending = await prisma.upiPayment.aggregate({
    where: { status: 'PENDING' },
    _sum: { amount: true }
  });

  const upiRejected = await prisma.upiPayment.aggregate({
    where: { status: 'REJECTED' },
    _sum: { amount: true }
  });

  // Calculate total deposits per user sum
  const users = await prisma.user.findMany({
    select: {
      email: true,
      balance: true,
      upiPayments: { where: { status: 'CONFIRMED' } },
      cryptoPayments: { where: { status: 'CONFIRMED' } }
    }
  });

  let sumUserDepositsInr = 0;
  for (const u of users) {
    const upiSum = u.upiPayments.reduce((a, b) => a + b.amount, 0);
    const cryptoSum = u.cryptoPayments.reduce((a, b) => a + b.amountUsdt * 96, 0);
    sumUserDepositsInr += (upiSum + cryptoSum);
  }

  console.log(JSON.stringify({
    upiAllStatus: upiAllStatus._sum.amount || 0,
    cryptoAllStatusUsdt: cryptoAllStatus._sum.amountUsdt || 0,
    userBalanceSum: userBalanceSum._sum.balance || 0,
    orderPriceSum: orderPriceSum._sum.priceCharged || 0,
    upiConfirmed: upiConfirmed._sum.amount || 0,
    upiPending: upiPending._sum.amount || 0,
    upiRejected: upiRejected._sum.amount || 0,
    sumUserDepositsInr
  }, null, 2));

  await prisma.$disconnect();
}

find79969().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
