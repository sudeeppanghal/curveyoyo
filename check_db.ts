import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const payment = await prisma.upiPayment.findUnique({
    where: { utr: "309736416407" }
  });
  console.log("PAYMENT:", payment);
}

check().catch(console.error).finally(() => prisma.$disconnect());
