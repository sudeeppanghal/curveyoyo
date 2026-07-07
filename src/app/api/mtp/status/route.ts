import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkMtpOrderStatus } from "@/lib/mtp/client";

/** GET /api/mtp/status?orderId=<mtpOrderId> — Check status of an MTP order */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const settings = await prisma.adminSettings.findUnique({
    where: { id: "global" },
    select: { mtpApiKey: true },
  });
  if (!settings?.mtpApiKey) return NextResponse.json({ error: "Provider not configured" }, { status: 503 });

  // Get the MTP order to find providerOrderId
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  const mtpOrder = await prisma.mtpOrder.findFirst({
    where: { id: orderId, userId: dbUser?.id },
  });
  if (!mtpOrder?.providerOrderId) return NextResponse.json({ error: "Order not found or no provider ID" }, { status: 404 });

  try {
    const result = await checkMtpOrderStatus(settings.mtpApiKey, mtpOrder.providerOrderId);
    // Update order status in DB
    if (result.status) {
      const mappedStatus =
        result.status === "Completed" ? "COMPLETED" :
        result.status === "Processing" ? "PROCESSING" :
        result.status === "Partial" ? "PARTIAL" :
        result.status === "Canceled" ? "FAILED" : "PROCESSING";
      await prisma.mtpOrder.update({
        where: { id: orderId },
        data: { status: mappedStatus, statusDetail: result.status },
      });
    }
    return NextResponse.json({ ok: true, status: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
