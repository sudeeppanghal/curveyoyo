import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPanelServices } from "@/lib/delivery/panel-client";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function verifyAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

// GET admin services
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const panelId = searchParams.get("panelId");
  const action = searchParams.get("action"); // "fetch" or "saved"

  if (!panelId) {
    return NextResponse.json({ error: "panelId is required" }, { status: 400 });
  }

  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
  });

  if (!panel) {
    return NextResponse.json({ error: "Panel not found" }, { status: 404 });
  }

  if (action === "fetch") {
    // Fetch live list of services from SMM API
    const start = Date.now();
    const res = await getPanelServices(panel.apiUrl, panel.apiKeyEncrypted);
    const responseMs = Date.now() - start;
    if (!res.ok) {
      // If it fails, update status to OFFLINE
      await prisma.panel.update({
        where: { id: panelId },
        data: { status: "OFFLINE", lastCheckedAt: new Date(), lastResponseMs: responseMs },
      });
      return NextResponse.json({ error: res.error ?? "Failed to fetch services from SMM API" }, { status: 502 });
    }

    // If it succeeds, update status to ONLINE
    const status = responseMs > 5000 ? "SLOW" : "ONLINE";
    await prisma.panel.update({
      where: { id: panelId },
      data: { status, lastCheckedAt: new Date(), lastResponseMs: responseMs },
    });

    return NextResponse.json({ services: res.services });
  }

  // Otherwise, return saved configurations
  const saved = await prisma.adminService.findMany({
    where: { panelId },
  });

  return NextResponse.json({ services: saved });
}

// POST configure/upsert an admin service pricing OR sync across matching SMM API keys
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, panelId, platform, type, serviceId, originalRate, name, minQuantity } = body;
  // customRate is always auto-computed as originalRate × 5 — never manually set
  const PRICE_MULTIPLIER = 5;

  if (!panelId) {
    return NextResponse.json({ error: "panelId is required" }, { status: 400 });
  }

  const sourcePanel = await prisma.panel.findUnique({ where: { id: panelId } });
  if (!sourcePanel) {
    return NextResponse.json({ error: "Panel not found" }, { status: 404 });
  }

  const cleanUrl = sourcePanel.apiUrl.trim().replace(/\/$/, "");

  // ACTION: SYNC ALL SERVICES ACROSS ALL API KEYS FOR THIS SMM PROVIDER
  if (action === "sync_all") {
    const sourceServices = await prisma.adminService.findMany({ where: { panelId } });
    const matchingPanels = await prisma.panel.findMany({
      where: { apiUrl: cleanUrl }
    });

    let syncedPanelsCount = 0;
    let syncedServicesCount = 0;

    for (const p of matchingPanels) {
      if (p.id !== panelId) {
        // Sync serviceIds JSON
        await prisma.panel.update({
          where: { id: p.id },
          data: { serviceIds: sourcePanel.serviceIds ?? undefined },
        });
      }
      syncedPanelsCount++;

      // Sync AdminService tables
      for (const s of sourceServices) {
        await prisma.adminService.upsert({
          where: {
            panelId_platform_type: {
              panelId: p.id,
              platform: s.platform,
              type: s.type,
            },
          },
          create: {
            panelId: p.id,
            platform: s.platform,
            type: s.type,
            serviceId: s.serviceId,
            originalRate: s.originalRate,
            customRate: parseFloat((s.originalRate * PRICE_MULTIPLIER).toFixed(6)),
            name: s.name,
            minQuantity: s.minQuantity,
            fallbackServiceIds: s.fallbackServiceIds ?? [],
          },
          update: {
            serviceId: s.serviceId,
            originalRate: s.originalRate,
            customRate: parseFloat((s.originalRate * PRICE_MULTIPLIER).toFixed(6)),
            name: s.name,
            minQuantity: s.minQuantity,
            fallbackServiceIds: s.fallbackServiceIds ?? [],
          },
        });
        syncedServicesCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully synced ${sourceServices.length} services across ${syncedPanelsCount} API keys connected to ${cleanUrl}.`,
      syncedPanelsCount,
      syncedServicesCount,
    });
  }

  // STANDARD SAVE: Save pricing and auto-apply to ALL matching API keys of this provider
  if (!platform || !type || !serviceId || originalRate === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const uppercasePlatform = String(platform).toUpperCase() as any;
  const typeLower = String(type).toLowerCase();
  const platformLower = String(platform).toLowerCase();

  // Find all panels sharing the same SMM API URL
  const matchingPanels = await prisma.panel.findMany({
    where: { apiUrl: cleanUrl }
  });

  let mainAdminService = null;

  for (const p of matchingPanels) {
    const s = await prisma.adminService.upsert({
      where: {
        panelId_platform_type: {
          panelId: p.id,
          platform: uppercasePlatform,
          type: typeLower,
        },
      },
      create: {
        panelId: p.id,
        platform: uppercasePlatform,
        type: typeLower,
        serviceId: String(serviceId),
        originalRate: parseFloat(originalRate),
        customRate: parseFloat((parseFloat(originalRate) * PRICE_MULTIPLIER).toFixed(6)),
        name: name ?? null,
        minQuantity: minQuantity ? parseInt(minQuantity) : 10,
      },
      update: {
        serviceId: String(serviceId),
        originalRate: parseFloat(originalRate),
        customRate: parseFloat((parseFloat(originalRate) * PRICE_MULTIPLIER).toFixed(6)),
        name: name ?? null,
        minQuantity: minQuantity ? parseInt(minQuantity) : 10,
      },
    });

    if (p.id === panelId) {
      mainAdminService = s;
    }

    // Update panel JSON serviceIds structure
    const currentJson = (p.serviceIds as Record<string, Record<string, string>> | null) ?? {};
    if (!currentJson[platformLower]) {
      currentJson[platformLower] = {};
    }
    currentJson[platformLower][typeLower] = String(serviceId);

    await prisma.panel.update({
      where: { id: p.id },
      data: { serviceIds: currentJson },
    });
  }

  return NextResponse.json({
    ok: true,
    service: mainAdminService,
    syncedPanels: matchingPanels.length,
    message: `Configured service applied to ${matchingPanels.length} API keys for ${cleanUrl}.`
  });
}
