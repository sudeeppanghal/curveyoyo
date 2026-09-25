import { NextRequest, NextResponse } from "next/server";

// Force dynamic so Next.js never tries to statically analyse this route
export const dynamic = "force-dynamic";

interface TickPayload {
  eventId: string;
  orderId: string;
  panelId: string | null;
  viewsBatch: number;
  reelUrl: string;
  platform?: string;
  // Legacy fields kept for backward compat:
  likesBatch?: number;
  savesBatch?: number;
  sharesBatch?: number;
  commentsBatch?: number;
  repostsBatch?: number;
}

async function handler(request: NextRequest) {
  try {
    const body = await request.json() as TickPayload;
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const { processEvent } = await import("@/lib/delivery/process");
    const result = await processEvent(eventId);

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        viewsDelivered: result.views,
      });
    } else {
      return NextResponse.json({
        ok: false,
        error: result.error,
      }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[TICK ROUTE ERROR]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey    = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!currentKey || !nextKey) {
      return NextResponse.json({ error: "QStash signing keys not configured" }, { status: 500 });
    }
    const { verifySignatureAppRouter } = await import("@upstash/qstash/nextjs");
    return verifySignatureAppRouter(handler)(req);
  }
  return handler(req);
}
