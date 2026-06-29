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
    const res = await getPanelServices(panel.apiUrl, panel.apiKeyEncrypted);
    if (!res.ok) {
      return NextResponse.json({ error: res.error ?? "Failed to fetch services from SMM API" }, { status: 502 });
    }
    return NextResponse.json({ services: res.services });
  }

  // Otherwise, return saved configurations
  const saved = await prisma.adminService.findMany({
    where: { panelId },
  });

  return NextResponse.json({ services: saved });
}

// POST configure/upsert an admin service pricing
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { panelId, platform, type, serviceId, originalRate, customRate, name } = body;

  if (!panelId || !platform || !type || !serviceId || originalRate === undefined || customRate === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const uppercasePlatform = String(platform).toUpperCase() as "INSTAGRAM" | "TIKTOK" | "YOUTUBE";

  const adminService = await prisma.adminService.upsert({
    where: {
      panelId_platform_type: {
        panelId,
        platform: uppercasePlatform,
        type: String(type).toLowerCase(),
      },
    },
    create: {
      panelId,
      platform: uppercasePlatform,
      type: String(type).toLowerCase(),
      serviceId: String(serviceId),
      originalRate: parseFloat(originalRate),
      customRate: parseFloat(customRate),
      name: name ?? null,
    },
    update: {
      serviceId: String(serviceId),
      originalRate: parseFloat(originalRate),
      customRate: parseFloat(customRate),
      name: name ?? null,
    },
  });

  // Also update the panel's JSON serviceIds structure for backward compatibility/redundancy
  const panel = await prisma.panel.findUnique({ where: { id: panelId } });
  if (panel) {
    const currentJson = (panel.serviceIds as Record<string, Record<string, string>> | null) ?? {};
    const platformLower = String(platform).toLowerCase();
    const typeLower = String(type).toLowerCase();
    
    if (!currentJson[platformLower]) {
      currentJson[platformLower] = {};
    }
    currentJson[platformLower][typeLower] = String(serviceId);

    await prisma.panel.update({
      where: { id: panelId },
      data: { serviceIds: currentJson },
    });
  }

  return NextResponse.json({ ok: true, service: adminService });
}
