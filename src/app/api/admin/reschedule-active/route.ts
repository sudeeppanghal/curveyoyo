import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDeliverySchedule } from "@/lib/delivery/curve";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret");
    const expected = process.env.ADMIN_SECRET || process.env.CRON_SECRET || "yoyosmm_admin_sec_9e3a1f8b4d0c7e2d5a6c8e9b";
    
    if (secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const deliveringOrders = await prisma.order.findMany({
      where: { status: "DELIVERING" },
      include: {
        user: true,
        reel: true,
      }
    });

    let rescheduledCount = 0;
    let eventsCreatedCount = 0;

    const activePanels = await prisma.panel.findMany({ where: { isActive: true }, orderBy: { priority: "asc" } });

    for (const order of deliveringOrders) {
      const viewsRemaining = order.viewsTarget - order.viewsDelivered;
      if (viewsRemaining <= 0) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "COMPLETED", completedAt: now }
        });
        continue;
      }

      // Delete old stuck SCHEDULED events for this order
      await prisma.deliveryEvent.deleteMany({
        where: { orderId: order.id, status: "SCHEDULED" }
      });

      const params = {
        totalViews: viewsRemaining,
        durationHours: Math.max(1, order.durationHours || 24),
        intervalMinutes: undefined,
        warmupHours: 0, // Fast start starting from right now!
        peakHours: Math.max(1, order.peakHours || 8),
        style: (order.curveStyle as any) || "ORGANIC",
        minQuantity: 100,
        engagementEnabled: order.engagementEnabled,
        likesRatioPct: order.likesRatioPct ?? 0,
        savesRatioPct: order.savesRatioPct ?? 0,
        sharesRatioPct: order.sharesRatioPct ?? 0,
        commentsRatioPct: order.commentsRatioPct ?? 0,
        repostsRatioPct: order.repostsRatioPct ?? 0,
      };

      const batches = generateDeliverySchedule(params);
      const firstBatchDelayMs = batches.length > 0 ? batches[0].scheduledDelayMs : 0;

      const eventData = batches.map((batch, idx) => {
        let delayMs = Math.max(0, batch.scheduledDelayMs - firstBatchDelayMs);
        if (idx === 0) delayMs = 0; // Starts NOW at t=0
        else delayMs = Math.max(2 * 60 * 1000, delayMs);

        const panel = activePanels[Math.floor(Math.random() * activePanels.length)] || activePanels[0];
        return {
          orderId: order.id,
          panelId: panel ? panel.id : null,
          viewsBatch: batch.views,
          likesBatch: batch.likes,
          savesBatch: batch.saves,
          sharesBatch: batch.shares,
          repostsBatch: batch.reposts,
          commentsBatch: batch.comments,
          scheduledAt: new Date(now.getTime() + delayMs),
          status: "SCHEDULED" as const,
        };
      });

      if (eventData.length > 0) {
        await prisma.deliveryEvent.createMany({ data: eventData });
        eventsCreatedCount += eventData.length;
        rescheduledCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      rescheduledCount,
      eventsCreatedCount,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
