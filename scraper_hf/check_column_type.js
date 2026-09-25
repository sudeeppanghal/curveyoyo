const { PrismaClient } = require('@prisma/client');
const dbLocal = "postgresql://postgres:f47ee48e1101f1ce55985563f842872c@localhost:54322/postgres";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbLocal
    }
  }
});

async function run() {
  try {
    const res = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'curve_style'
    `;
    console.log("Column details:", res);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
