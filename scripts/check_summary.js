
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSummary() {
  const upiSummary = await prisma.$queryRaw`
    SELECT status, count(*)::int as count, sum(amount)::float as total_amount 
    FROM upi_payments 
    GROUP BY status;
  `;

  const cryptoSummary = await prisma.$queryRaw`
    SELECT status, count(*)::int as count, sum(amount_usdt)::float as total_usdt 
    FROM crypto_payments 
    GROUP BY status;
  `;

  const userBalances = await prisma.$queryRaw`
    SELECT 
      sum(balance)::float as total_positive_balance,
      sum(CASE WHEN balance > 0 THEN balance ELSE 0 END)::float as total_user_wallet_funds,
      sum(bonus_balance)::float as total_bonus_balance
    FROM users;
  `;

  console.log(JSON.stringify({
    upiSummary,
    cryptoSummary,
    userBalances: userBalances[0]
  }, null, 2));

  await prisma.$disconnect();
}

checkSummary().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
