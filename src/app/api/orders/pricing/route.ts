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

  const isSpecialUser = dbUser.email.toLowerCase() === "arpitasumanekka@gmail.com";
  const userPanels = await prisma.panel.findMany({
    where: { userId: isSpecialUser ? dbUser.id : null, isActive: true },
    orderBy: { priority: "desc" },
  });

  const activeAdminPanels = (isSpecialUser && userPanels.length > 0) ? userPanels : await prisma.panel.findMany({
    where: { userId: null, isActive: true },
    orderBy: { priority: "desc" },
  });

  const defaultServices = { views: 3.0, reach_impressions_views: 4.5, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 };
  const rates: Record<string, Record<string, number>> = {
    INSTAGRAM: { ...defaultServices },
    TIKTOK: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 },
    FACEBOOK: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 },
    YOUTUBE: { views: 225.60, likes: 139.20, saves: 5.0, shares: 8.0, comments: 15.0 },
  };

  // Populate rates based on SMM panel routing
  for (const p of activeAdminPanels) {
    const url = p.apiUrl.toLowerCase();
    const isMTP = url.includes("morethanpanel.com");
    const isYoyo = url.includes("yoyomedia.in");

    const svcs = await prisma.adminService.findMany({
      where: { panelId: p.id },
    });

    for (const s of svcs) {
      const platform = s.platform;
      const type = s.type.toLowerCase();

      // Routing checks matching orders/route.ts
      const isMoreThanService = 
        platform === "YOUTUBE" || 
        (platform === "FACEBOOK" && type === "likes") ||
        (platform === "TIKTOK" && type === "views");

      if (isMoreThanService && isMTP) {
        if (!rates[platform]) rates[platform] = { ...defaultServices };
        rates[platform][type] = s.customRate;
      } else if (!isMoreThanService && isYoyo) {
        if (!rates[platform]) rates[platform] = { ...defaultServices };
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
