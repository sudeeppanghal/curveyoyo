import { prisma } from "@/lib/prisma";
import { generateDeliverySchedule } from "@/lib/delivery/curve";
import type { CurveParams } from "@/lib/delivery/curve";

/**
 * Schedules all delivery events for an order in the DB.
 * Then enqueues each batch as a QStash message with the correct delay.
 *
 * IMPORTANT: QStash scheduling is done via the /api/delivery/start route
 * which calls this after order creation so we have the order ID.
 */
export async function scheduleOrderDelivery(orderId: string): Promise<{
  ok: boolean;
  batchCount: number;
  totalViews: number;
  error?: string;
}> {
  // Check if events are already created (custom schedule)
  const existingEvents = await prisma.deliveryEvent.findMany({
    where: { orderId },
  });

  if (existingEvents.length > 0) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          include: {
            panels: {
              where: { isActive: true },
              orderBy: { priority: "asc" },
            },
          },
        },
      },
    });

    if (!order) return { ok: false, batchCount: 0, totalViews: 0, error: "Order not found" };

    const isWallet = order.user.walletMode;
    const activePanels = isWallet
      ? await prisma.panel.findMany({ where: { userId: null, isActive: true }, orderBy: { priority: "asc" } })
      : order.user.panels;

    let validPanels = activePanels;
    if (isWallet && (order as any).reel) {
      const platform = ((order as any).reel.platform as string).toUpperCase();
      const configuredPanels: any[] = [];
      for (const p of activePanels) {
        const svcs = await prisma.adminService.findMany({
          where: { panelId: p.id, platform: platform as any },
        });
        if (svcs.length > 0) configuredPanels.push(p);
      }
      if (configuredPanels.length > 0) validPanels = configuredPanels;
    }
    const onlinePanels = validPanels.filter((p: any) => p.status !== "OFFLINE");
    const panelPool = onlinePanels.length > 0 ? onlinePanels : validPanels;

    if (!panelPool.length) {
      return { ok: false, batchCount: 0, totalViews: 0, error: isWallet ? "No active admin panels configured" : "No active panels" };
    }

    // Randomize existing event panelIds across the available pool
    await Promise.all(
      existingEvents.map((e) =>
        prisma.deliveryEvent.update({
          where: { id: e.id },
          data: { panelId: panelPool[Math.floor(Math.random() * panelPool.length)].id },
        })
      )
    );

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "QUEUED",
        startedAt: new Date(),
        panelId: panelPool[0].id,
      },
    });

    return {
      ok: true,
      batchCount: existingEvents.length,
      totalViews: existingEvents.reduce((sum, e) => sum + e.viewsBatch, 0),
    };
  }

  // Load order + reel + first active panel
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      reel: true,
      user: {
        include: {
          panels: {
            where: { isActive: true },
            orderBy: { priority: "asc" },
          },
        },
      },
    },
  });

  if (!order) return { ok: false, batchCount: 0, totalViews: 0, error: "Order not found" };

  const isWallet = order.user.walletMode;
  const activePanels = isWallet
    ? await prisma.panel.findMany({ where: { userId: null, isActive: true }, orderBy: { priority: "asc" } })
    : order.user.panels;

  let validPanels = activePanels;
  if (isWallet && (order as any).reel) {
    const platform = ((order as any).reel.platform as string).toUpperCase();
    const configuredPanels: any[] = [];
    for (const p of activePanels) {
      const svcs = await prisma.adminService.findMany({
        where: { panelId: p.id, platform: platform as any },
      });
      if (svcs.length > 0) configuredPanels.push(p);
    }
    if (configuredPanels.length > 0) validPanels = configuredPanels;
  }
  const onlinePanels = validPanels.filter((p: any) => p.status !== "OFFLINE");
  const panelPool = onlinePanels.length > 0 ? onlinePanels : validPanels;

  if (!panelPool.length) {
    return { ok: false, batchCount: 0, totalViews: 0, error: isWallet ? "No active admin panels configured" : "No active panels" };
  }

  let viewsMinQty = 100;
  try {
    const platform = ((order as any).reel?.platform as string || "INSTAGRAM").toUpperCase();
    const activeSvc = await prisma.adminService.findFirst({
      where: { panelId: panelPool[0]?.id, platform: platform as any, type: "views" }
    });
    if (activeSvc && activeSvc.minQuantity > 0) viewsMinQty = activeSvc.minQuantity;
  } catch {}

  // Generate the S-curve batches
  const params: CurveParams = {
    totalViews: order.viewsTarget,
    durationHours: order.durationHours,
    warmupHours: order.warmupHours,
    peakHours: order.peakHours,
    style: order.curveStyle,
    minQuantity: viewsMinQty,
  };
  const batches = generateDeliverySchedule(params);

  // Persist all delivery events to DB with randomized panel assignment
  const now = new Date();
  const data = batches.map((batch, index) => {
    let delayMs = batch.scheduledDelayMs;
    if (index === 0) {
      delayMs = 0; // First batch starts instantly!
    } else if (index < batches.length - 1) {
      // Add ±5 minutes of random time jitter (±300,000 ms)
      const jitterMs = (Math.random() * 2 - 1) * 5 * 60 * 1000;
      delayMs = Math.max(2 * 60 * 1000, delayMs + jitterMs); // keep at least 2 minutes delay
    }
    const randomPanel = panelPool[Math.floor(Math.random() * panelPool.length)];
    return {
      orderId: order.id,
      panelId: randomPanel.id,
      viewsBatch: batch.views,
      scheduledAt: new Date(now.getTime() + delayMs),
      status: "SCHEDULED" as const,
    };
  });

  // Sort chronologically to maintain strictly increasing execution times
  data.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  await prisma.deliveryEvent.createMany({
    data,
  });

  // Mark order as QUEUED + record start time + assign panel
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "QUEUED",
      startedAt: now,
      panelId: panelPool[0].id,
    },
  });

  return {
    ok: true,
    batchCount: batches.length,
    totalViews: batches.reduce((a, b) => a + b.views, 0),
  };
}
