const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const upiPayments = await prisma.upiPayment.aggregate({
      _sum: { amount: true },
      where: { status: 'CONFIRMED' }
    });
    
    const cryptoPayments = await prisma.cryptoPayment.aggregate({
      _sum: { amountUsdt: true },
      where: { status: 'CONFIRMED' }
    });
    
    console.log('UPI Confirmed:', upiPayments._sum.amount);
    console.log('Crypto Confirmed (USDT):', cryptoPayments._sum.amountUsdt);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
