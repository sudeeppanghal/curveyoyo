
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listPostgresTables() {
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  console.log('Postgres Tables:', tables);

  for (const t of tables) {
    const tableName = t.table_name;
    try {
      const countRes = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "${tableName}"`);
      console.log(`Table "${tableName}":`, countRes[0].count.toString());
    } catch (e) {
      console.log(`Error reading "${tableName}":`, e.message);
    }
  }

  await prisma.$disconnect();
}

listPostgresTables().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
