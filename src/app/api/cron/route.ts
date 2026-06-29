import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processEvent } from "@/lib/delivery/process";

export const dynamic = "force-dynamic";

// Tune this based on your Vercel plan:
// Free (Hobby) = 5  →  safe within 10s timeout
// Pro          = 20 →  safe within 60s timeout
const PARALLEL_LIMIT = 5;

// Process a batch in parallel chunks
async function parallelBatch<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<unknown>,
) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.allSettled(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

export async function GET(req: NextRequest) {
  const secret   = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET or ADMIN_SECRET env var not set" }, { status: 500 });
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find ALL due SCHEDULED events
  const dueEvents = await prisma.deliveryEvent.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      order: { status: "DELIVERING" },
    },
    orderBy: { scheduledAt: "asc" },
    // Cap at PARALLEL_LIMIT × 4 so we don't overload the DB query
    // Any extras are picked up in subsequent cron calls
    take: PARALLEL_LIMIT * 4,
    select: { id: true },
  });

  if (dueEvents.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "No events due", timestamp: now.toISOString() });
  }

  // Process PARALLEL_LIMIT events simultaneously (not sequential!)
  const allResults = await parallelBatch(
    dueEvents.map(e => e.id),
    PARALLEL_LIMIT,
    processEvent
  );

  const succeeded = allResults.filter(r => r.status === "fulfilled" && (r.value as { ok: boolean }).ok).length;
  const failed    = allResults.filter(r => r.status === "rejected" || !(r as PromiseFulfilledResult<{ ok: boolean }>).value?.ok).length;

  return NextResponse.json({
    ok:        true,
    processed: dueEvents.length,
    succeeded,
    failed,
    parallelLimit: PARALLEL_LIMIT,
    timestamp: now.toISOString(),
  });
}
