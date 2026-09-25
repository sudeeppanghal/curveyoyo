import { NextRequest, NextResponse } from "next/server";
import { runAutoSync } from "@/lib/delivery/auto-sync";

// Expected secret from Vercel Cron or manual trigger
const CRON_SECRET = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret") || request.headers.get("Authorization")?.replace("Bearer ", "");
  
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await runAutoSync();
    return NextResponse.json({ ok: true, logsProcessed: logs.length });
  } catch (error) {
    console.error("AutoSync Cron Error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
