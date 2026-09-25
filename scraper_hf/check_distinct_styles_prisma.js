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
    const orders = await prisma.$queryRaw`SELECT DISTINCT curve_style FROM orders`;
    console.log("Orders styles:", orders);
    const templates = await prisma.$queryRaw`SELECT DISTINCT style FROM curve_templates`;
    console.log("Templates styles:", templates);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
