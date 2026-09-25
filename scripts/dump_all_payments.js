
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dumpAllPayments() {
  const upi = await prisma.upiPayment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true, name: true } } }
  });

  const crypto = await prisma.cryptoPayment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true, name: true } } }
  });

  console.log(JSON.stringify({ upi, crypto }, null, 2));
  await prisma.$disconnect();
}

dumpAllPayments().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
