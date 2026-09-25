
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCrypto() {
  const crypto = await prisma.cryptoPayment.findMany({
    include: { user: { select: { email: true } } }
  });
  console.log(JSON.stringify(crypto, null, 2));
  await prisma.$disconnect();
}

listCrypto().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
