
const { PrismaClient } = require('@prisma/client');

async function checkLocalPostgres() {
  const localUrl = 'postgresql://postgres:postgres@localhost:54322/yoyosmm';
  const localUrl2 = 'postgresql://postgres:postgres@localhost:5432/yoyosmm';
  const localUrl3 = 'postgresql://postgres:JaatRam%40%239211@localhost:5432/postgres';
  const localUrl4 = 'postgresql://postgres:JaatRam%40%239211@localhost:54322/postgres';

  const urls = [
    { name: 'Supabase (from .env)', url: process.env.DATABASE_URL },
    { name: 'Local 54322 (yoyosmm)', url: localUrl },
    { name: 'Local 5432 (yoyosmm)', url: localUrl2 },
    { name: 'Local 5432 (postgres)', url: localUrl3 },
    { name: 'Local 54322 (postgres)', url: localUrl4 }
  ];

  for (const item of urls) {
    if (!item.url) continue;
    console.log('\n--- Testing DB Connection:', item.name, '---');
    const client = new PrismaClient({ datasources: { db: { url: item.url } } });
    try {
      const upiCount = await client.upiPayment.count();
      const upiSum = await client.upiPayment.aggregate({ _sum: { amount: true } });
      const ordersCount = await client.order.count();
      const usersCount = await client.user.count();
      
      console.log({
        name: item.name,
        usersCount,
        ordersCount,
        upiCount,
        upiTotalAmount: upiSum._sum.amount
      });
    } catch (e) {
      console.log(`Failed connecting to ${item.name}:`, e.message);
    } finally {
      await client.$disconnect();
    }
  }
}

checkLocalPostgres();
