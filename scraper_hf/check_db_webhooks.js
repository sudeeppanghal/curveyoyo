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
    console.log("=== DB TRIGGERS ON panels TABLE ===");
    const triggers = await prisma.$queryRaw`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'panels'
    `;
    console.log(triggers);

    console.log("\n=== ALL DATABASE WEBHOOKS (SUPABASE) ===");
    const webhooks = await prisma.$queryRaw`
      SELECT * FROM supabase_functions.hooks
    `;
    console.log(webhooks);

  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
