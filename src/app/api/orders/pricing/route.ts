import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // If not wallet user, rates are not applicable
  if (!dbUser.walletMode) {
    return NextResponse.json({ walletMode: false });
  }

  // Fetch active admin panels
  const activeAdminPanels = await prisma.panel.findMany({
    where: { userId: null, isActive: true },
    orderBy: { priority: "asc" },
  });

  const rates: Record<string, Record<string, number>> = {
    INSTAGRAM: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 },
    TIKTOK: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 },
    YOUTUBE: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 },
  };

  let adminPanel = activeAdminPanels[0];
  let adminServices: any[] = [];

  for (const p of activeAdminPanels) {
    const svcs = await prisma.adminService.findMany({
      where: { panelId: p.id },
    });
    if (svcs.length > 0) {
      adminPanel = p;
      adminServices = svcs;
      break;
    }
  }

  if (adminPanel && adminServices.length > 0) {

    for (const s of adminServices) {
      const platform = s.platform;
      const type = s.type.toLowerCase();
      if (rates[platform]) {
        rates[platform][type] = s.customRate;
      }
    }
  }

  return NextResponse.json({
    walletMode: true,
    balance: dbUser.balance,
    rates,
  });
}
