import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

/** GET /api/admin/settings — get wallet config */
export async function GET(request: NextRequest) {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
  return NextResponse.json({ settings });
}

/** PATCH /api/admin/settings — update wallet config */
export async function PATCH(request: NextRequest) {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { trc20Address, bep20Address, priceUsdt, siteName, freeTrialHours, maintenanceMode, supportEmail, upiId, upiQrCode, minDeposit } = body;

  const settings = await prisma.adminSettings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      trc20Address, bep20Address, priceUsdt,
      siteName, freeTrialHours, maintenanceMode, supportEmail,
      upiId, upiQrCode, minDeposit: minDeposit !== undefined ? parseFloat(minDeposit) : 500.0,
    },
    update: {
      ...(trc20Address !== undefined && { trc20Address }),
      ...(bep20Address !== undefined && { bep20Address }),
      ...(priceUsdt !== undefined && { priceUsdt }),
      ...(siteName !== undefined && { siteName }),
      ...(freeTrialHours !== undefined && { freeTrialHours }),
      ...(maintenanceMode !== undefined && { maintenanceMode }),
      ...(supportEmail !== undefined && { supportEmail }),
      ...(upiId !== undefined && { upiId }),
      ...(upiQrCode !== undefined && { upiQrCode }),
      ...(minDeposit !== undefined && { minDeposit: parseFloat(minDeposit) }),
    },
  });


  return NextResponse.json({ ok: true, settings });
}
