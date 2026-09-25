
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const upiConfirmed = await prisma.upiPayment.findMany({
    where: { status: 'CONFIRMED' }
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let todayDeposit = 0;
  let last7DaysDeposit = 0;
  let last30DaysDeposit = 0;
  let last60DaysDeposit = 0;
  let totalDeposit = 0;

  upiConfirmed.forEach(p => {
    const amt = p.amount || 0;
    const createdAt = new Date(p.createdAt);

    totalDeposit += amt;
    if (createdAt >= sixtyDaysAgo) last60DaysDeposit += amt;
    if (createdAt >= thirtyDaysAgo) last30DaysDeposit += amt;
    if (createdAt >= sevenDaysAgo) last7DaysDeposit += amt;
    if (createdAt >= startOfToday) todayDeposit += amt;
  });

  console.log('--- DEPOSIT METRICS SUMMARY ---');
  console.log('Today Deposits (₹):', todayDeposit);
  console.log('Last 7 Days Deposits (₹):', last7DaysDeposit);
  console.log('Last 30 Days (1 Month) Deposits (₹):', last30DaysDeposit);
  console.log('Last 60 Days (2 Months) Deposits (₹):', last60DaysDeposit);
  console.log('Total All-Time Deposits (₹):', totalDeposit);

  await prisma.$disconnect();
}
main().catch(console.error);
