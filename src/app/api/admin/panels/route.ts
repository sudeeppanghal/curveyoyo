import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getPanelServices } from "@/lib/delivery/panel-client";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function verifyAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

// GET all admin panels or test connection
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "test") {
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const panel = await prisma.panel.findUnique({ where: { id } });
    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 });
    }

    const start = Date.now();
    const res = await getPanelServices(panel.apiUrl, panel.apiKeyEncrypted);
    const responseMs = Date.now() - start;

    const status = res.ok ? (responseMs > 5000 ? "SLOW" : "ONLINE") : "OFFLINE";

    await prisma.panel.update({
      where: { id },
      data: { status: status as any, lastCheckedAt: new Date(), lastResponseMs: responseMs },
    });

    return NextResponse.json({
      ok: res.ok,
      status,
      error: res.ok ? null : (res.error ?? "Failed to connect to SMM panel API. Please check your API URL and Key."),
    });
  }

  const panels = await prisma.panel.findMany({
    where: { userId: null },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json({ panels });
}

// POST add a new admin panel
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, apiUrl, apiKey, priority, loadPercentage } = body;

  if (!name || !apiUrl || !apiKey) {
    return NextResponse.json({ error: "name, apiUrl, and apiKey are required" }, { status: 400 });
  }

  const apiKeyEncrypted = encrypt(apiKey);

  // Ping provider to get initial status
  let initialStatus = "UNKNOWN";
  let responseMs = null;
  try {
    const start = Date.now();
    const res = await getPanelServices(apiUrl.trim().replace(/\/$/, ""), apiKeyEncrypted);
    responseMs = Date.now() - start;
    if (res.ok) {
      initialStatus = responseMs > 5000 ? "SLOW" : "ONLINE";
    } else {
      initialStatus = "OFFLINE";
    }
  } catch {
    initialStatus = "OFFLINE";
  }

  const cleanApiUrl = apiUrl.trim().replace(/\/$/, "");
  const existingPanelWithSameUrl = await prisma.panel.findFirst({
    where: { userId: null, apiUrl: cleanApiUrl },
    orderBy: { createdAt: "asc" }
  });

  const serviceIdsCopy = existingPanelWithSameUrl ? (existingPanelWithSameUrl.serviceIds || undefined) : undefined;

  const panel = await prisma.panel.create({
    data: {
      userId: null, // Admin panel
      name,
      apiUrl: cleanApiUrl,
      apiKeyEncrypted,
      priority: parseInt(priority) || 1,
      loadPercentage: parseInt(loadPercentage) || 100,
      status: initialStatus as any,
      lastCheckedAt: new Date(),
      lastResponseMs: responseMs,
      serviceIds: serviceIdsCopy
    },
  });

  if (existingPanelWithSameUrl) {
    const existingServices = await prisma.adminService.findMany({
      where: { panelId: existingPanelWithSameUrl.id }
    });

    for (const s of existingServices) {
      await prisma.adminService.upsert({
        where: {
          panelId_platform_type: {
            panelId: panel.id,
            platform: s.platform,
            type: s.type
          }
        },
        create: {
          panelId: panel.id,
          platform: s.platform,
          type: s.type,
          serviceId: s.serviceId,
          originalRate: s.originalRate,
          customRate: s.customRate,
          name: s.name,
          minQuantity: s.minQuantity
        },
        update: {
          serviceId: s.serviceId,
          originalRate: s.originalRate,
          customRate: s.customRate,
          name: s.name,
          minQuantity: s.minQuantity
        }
      });
    }
  }

  return NextResponse.json({ panel }, { status: 201 });
}

// DELETE an admin panel
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.panel.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
