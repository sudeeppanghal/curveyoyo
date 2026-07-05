const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const adminEmails = ["arpitasumanekka@gmail.com"];
    const admins = await prisma.user.findMany({ where: { email: { in: adminEmails } } });
    const adminIds = admins.map(a => a.id);

    const upiPayments = await prisma.upiPayment.aggregate({
      _sum: { amount: true },
      where: { 
        status: 'CONFIRMED',
        userId: { notIn: adminIds }
      }
    });
    
    const cryptoPayments = await prisma.cryptoPayment.aggregate({
      _sum: { amountUsdt: true },
      where: { 
        status: 'CONFIRMED',
        userId: { notIn: adminIds }
      }
    });
    
    console.log('UPI Confirmed (Excl Admin):', upiPayments._sum.amount);
    console.log('Crypto Confirmed USDT (Excl Admin):', cryptoPayments._sum.amountUsdt);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
