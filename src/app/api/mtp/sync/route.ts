import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMtpServices, calcCustomRate } from "@/lib/mtp/client";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

/** POST /api/mtp/sync — Admin only. Fetch all services from provider and store. */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
  if (!settings?.mtpApiKey) {
    return NextResponse.json({ error: "API key not configured. Add it in the admin panel first." }, { status: 400 });
  }

  let rawServices;
  try {
    rawServices = await fetchMtpServices(settings.mtpApiKey);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to reach provider: ${message}` }, { status: 502 });
  }

  // Upsert all services
  let upsertedCount = 0;
  for (const svc of rawServices) {
    const usdRate = parseFloat(String(svc.rate));
    if (isNaN(usdRate)) continue;
    await prisma.mtpService.upsert({
      where: { serviceId: String(svc.service) },
      create: {
        serviceId: String(svc.service),
        name: svc.name,
        category: svc.category,
        type: svc.type || "Default",
        rate: usdRate,
        customRate: calcCustomRate(usdRate),
        minOrder: parseInt(String(svc.min), 10) || 10,
        maxOrder: parseInt(String(svc.max), 10) || 1000000,
        isActive: true,
      },
      update: {
        name: svc.name,
        category: svc.category,
        type: svc.type || "Default",
        rate: usdRate,
        customRate: calcCustomRate(usdRate),
        minOrder: parseInt(String(svc.min), 10) || 10,
        maxOrder: parseInt(String(svc.max), 10) || 1000000,
      },
    });
    upsertedCount++;
  }

  // Update sync metadata
  await prisma.adminSettings.update({
    where: { id: "global" },
    data: { mtpLastSyncAt: new Date(), mtpServiceCount: upsertedCount },
  });

  return NextResponse.json({ ok: true, synced: upsertedCount });
}
