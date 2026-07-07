import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres.rrzdclvrdicauuvdlwgd:JaatRam%40%239211@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres" } } });
async function run() {
  const result: any[] = await prisma.$queryRawUnsafe(`
    SELECT pid, state, wait_event_type, wait_event, query 
    FROM pg_stat_activity 
    WHERE pid <> pg_backend_pid()
  `);
  console.log("Active sessions:", JSON.stringify(result, null, 2));
}
run().finally(() => prisma.$disconnect());
