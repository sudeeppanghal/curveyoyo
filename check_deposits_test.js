
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const upiPayments = await prisma.upiPayment.findMany();
  const cryptoPayments = await prisma.cryptoPayment.findMany();

  console.log('--- UPI PAYMENTS ---');
  console.log('Total count:', upiPayments.length);
  upiPayments.forEach(p => console.log(`ID: ${p.id} | Amount: ${p.amount} | Status: ${p.status} | Created: ${p.createdAt.toISOString()}`));

  console.log('--- CRYPTO PAYMENTS ---');
  console.log('Total count:', cryptoPayments.length);
  cryptoPayments.forEach(p => console.log(`ID: ${p.id} | Amount: ${p.amount} | Status: ${p.status} | Created: ${p.createdAt.toISOString()}`));

  await prisma.$disconnect();
}
main().catch(console.error);
