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
    const panels = await prisma.panel.findMany({
      select: { id: true, name: true, isActive: true, apiUrl: true }
    });
    console.log("Panels in database:", panels);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
