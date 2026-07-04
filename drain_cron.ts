import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { processEvent } from './src/lib/delivery/process';

const prisma = new PrismaClient();
const PARALLEL_LIMIT = 20;

async function parallelBatch<T>(items: T[], limit: number, fn: (item: T) => Promise<unknown>) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.allSettled(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

async function main() {
  let count = 0;
  while (true) {
    const now = new Date();
    const dueEvents = await prisma.deliveryEvent.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now },
        order: { status: "DELIVERING" },
      },
      orderBy: { scheduledAt: "asc" },
      take: PARALLEL_LIMIT,
      select: { id: true }
    });

    if (dueEvents.length === 0) {
      console.log("No more due events.");
      break;
    }

    console.log(`Processing batch of ${dueEvents.length} events...`);
    const allResults = await parallelBatch(
      dueEvents.map(e => e.id),
      PARALLEL_LIMIT,
      processEvent
    );

    const succeeded = allResults.filter(r => r.status === "fulfilled" && (r.value as { ok: boolean }).ok).length;
    const failed = allResults.filter(r => r.status === "rejected" || !(r as PromiseFulfilledResult<{ ok: boolean }>).value?.ok).length;

    console.log(`Succeeded: ${succeeded}, Failed: ${failed}`);
    count += dueEvents.length;
    
    // Give it a tiny sleep to not hammer the panel API
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`Drained ${count} events from the backlog!`);
}

main().finally(() => prisma.$disconnect());
