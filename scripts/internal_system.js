
require('dotenv').config({ path: '/var/www/yoyosmm/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSystemCalc() {
  const EXCLUDED_ADMIN_EMAILS = ["arpitasumanekka@gmail.com", "kg44314@gmail.com"];

  const totalDepositInrRes = await prisma.upiPayment.aggregate({
    where: {
      status: "CONFIRMED",
      user: {
        email: { notIn: EXCLUDED_ADMIN_EMAILS },
      },
    },
    _sum: { amount: true },
  });
  let totalDepositInr = totalDepositInrRes._sum.amount ?? 0;

  const confirmedCrypto = await prisma.cryptoPayment.findMany({
    where: {
      status: "CONFIRMED",
      user: {
        email: { notIn: EXCLUDED_ADMIN_EMAILS },
      },
    },
    include: { user: true },
  });
  for (const cp of confirmedCrypto) {
    totalDepositInr += Math.round((cp.amountUsdt ?? 0) * 96);
  }

  console.log('SYSTEM_ROUTE_TOTAL_DEPOSIT_INR:', totalDepositInr);
  console.log('ENV ADMIN_SECRET:', process.env.ADMIN_SECRET);
  await prisma.$disconnect();
}

checkSystemCalc().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
