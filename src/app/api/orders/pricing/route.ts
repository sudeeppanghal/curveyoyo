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

  // Fetch active admin panels
  const activeAdminPanels = await prisma.panel.findMany({
    where: { userId: null, isActive: true },
    orderBy: { priority: "asc" },
  });

  const defaultServices = { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0, followers: 10.0, subscribers: 15.0, members: 8.0, reactions: 4.0, retweets: 6.0 };
  const rates: Record<string, Record<string, number>> = {
    INSTAGRAM: { ...defaultServices },
    TIKTOK: { ...defaultServices },
    YOUTUBE: { ...defaultServices },
    TELEGRAM: { ...defaultServices },
    FACEBOOK: { ...defaultServices },
    TWITTER: { ...defaultServices },
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
      if (!rates[platform]) {
        rates[platform] = { ...defaultServices };
      }
      rates[platform][type] = s.customRate;
    }
  }

  return NextResponse.json({
    walletMode: true,
    balance: dbUser.balance,
    rates,
  });
}
