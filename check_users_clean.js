const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
  console.log('--- RECENT 10 USERS ---');
  users.forEach(u => {
    console.log(`ID: ${u.id} | Email: ${u.email} | SupabaseId: ${u.supabaseId || 'NULL'} | Created: ${u.createdAt.toISOString()}`);
  });
  await prisma.$disconnect();
}

main().catch(console.error);
