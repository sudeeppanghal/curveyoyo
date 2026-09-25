
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function search80k() {
  const allUpi = await prisma.upiPayment.findMany({ include: { user: true } });
  const allCrypto = await prisma.cryptoPayment.findMany({ include: { user: true } });
  const allOrders = await prisma.order.findMany();
  const allUsers = await prisma.user.findMany();
  const allSplits = await prisma.profitSplit.findMany();

  console.log('--- UPI Payments Breakdown ---');
  let upiConfirmed = 0, upiPending = 0, upiRejected = 0;
  for (const u of allUpi) {
    if (u.status === 'CONFIRMED') upiConfirmed += u.amount;
    if (u.status === 'PENDING') upiPending += u.amount;
    if (u.status === 'REJECTED') upiRejected += u.amount;
  }
  console.log({ upiConfirmed, upiPending, upiRejected, totalUpiAll: upiConfirmed + upiPending + upiRejected });

  console.log('--- Crypto Payments Breakdown ---');
  let cryptoConfirmedUsdt = 0, cryptoRejectedUsdt = 0;
  for (const c of allCrypto) {
    if (c.status === 'CONFIRMED') cryptoConfirmedUsdt += c.amountUsdt;
    if (c.status === 'REJECTED') cryptoRejectedUsdt += c.amountUsdt;
  }
  console.log({
    cryptoConfirmedUsdt,
    cryptoRejectedUsdt,
    totalCryptoUsdtAll: cryptoConfirmedUsdt + cryptoRejectedUsdt,
    cryptoConfirmedInr96: cryptoConfirmedUsdt * 96,
    cryptoRejectedInr96: cryptoRejectedUsdt * 96,
    totalCryptoInr96All: (cryptoConfirmedUsdt + cryptoRejectedUsdt) * 96
  });

  console.log('--- User Balances & Stats ---');
  let totalBalances = 0, totalDepositedField = 0;
  for (const user of allUsers) {
    totalBalances += user.balance;
    totalDepositedField += (user.totalDeposited || 0);
  }
  console.log({ totalBalances, totalDepositedField });

  console.log('--- Orders Total Charged ---');
  let totalOrderPrice = 0;
  for (const o of allOrders) {
    totalOrderPrice += o.priceCharged;
  }
  console.log({ totalOrderPrice });

  // Let's test combinations:
  // Comb 1: All UPI + All Crypto at 96
  const comb1 = (upiConfirmed + upiPending + upiRejected) + ((cryptoConfirmedUsdt + cryptoRejectedUsdt) * 96);
  console.log('Comb 1 (All UPI + All Crypto 96):', comb1);

  // Comb 2: Confirmed UPI + All Crypto at 96
  const comb2 = upiConfirmed + ((cryptoConfirmedUsdt + cryptoRejectedUsdt) * 96);
  console.log('Comb 2 (Confirmed UPI + All Crypto 96):', comb2);

  // Comb 3: Confirmed UPI + Rejected Crypto at 96
  const comb3 = upiConfirmed + (cryptoRejectedUsdt * 96);
  console.log('Comb 3 (Confirmed UPI + Rejected Crypto 96):', comb3);

  await prisma.$disconnect();
}

search80k().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
