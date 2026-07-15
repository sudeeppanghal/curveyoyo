import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platform = request.nextUrl.searchParams.get("platform")?.toLowerCase();
  if (!platform || !["instagram", "tiktok", "facebook", "youtube"].includes(platform)) {
    return NextResponse.json({ error: "Valid platform query parameter is required" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      panels: {
        where: { isActive: true },
        orderBy: { priority: "asc" },
      },
    },
  });

  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  
  const isSpecialUser = dbUser.email.toLowerCase() === "arpitasumanekka@gmail.com";
  let panels = dbUser.panels;
  if ((dbUser.walletMode && !isSpecialUser) || panels.length === 0) {
    panels = await prisma.panel.findMany({
      where: { userId: null, isActive: true },
      orderBy: { priority: "asc" },
    });
  }

  if (!panels.length) {
    return NextResponse.json({
      limits: { views: null, likes: null, saves: null, shares: null, comments: null }
    });
  }

  // Look at the primary panel config
  const panel = panels[0];
  const serviceIds = panel.serviceIds as Record<string, Record<string, string>> | null;
  if (!serviceIds || !serviceIds[platform]) {
    return NextResponse.json({
      limits: { views: null, likes: null, saves: null, shares: null, comments: null }
    });
  }

  const platformIds = serviceIds[platform];
  const apiKey = decrypt(panel.apiKeyEncrypted);

  try {
    // Ping panel API to get all services
    const res = await fetch(panel.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: apiKey, action: "services" }).toString(),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const services = await res.json();
    if (!Array.isArray(services)) throw new Error("Invalid SMM response");

    const adminServices = await prisma.adminService.findMany({
      where: { panelId: panel.id, platform: platform.toUpperCase() as any }
    });

    const limits: Record<string, { min: number; max: number } | null> = {
      views: null,
      likes: null,
      saves: null,
      shares: null,
      comments: null,
    };

    Object.keys(limits).forEach((type) => {
      const adminSvc = adminServices.find((s) => s.type.toLowerCase() === type.toLowerCase());
      const id = platformIds[type] || adminSvc?.serviceId;
      if (id) {
        const match = services.find((s) => String(s.service) === String(id));
        if (match) {
          const apiMin = match.min !== undefined && match.min !== null ? Number(match.min) : (type === "comments" ? 5 : (type === "views" ? 100 : 10));
          limits[type] = {
            min: adminSvc && adminSvc.minQuantity > 0 ? adminSvc.minQuantity : apiMin,
            max: Number(match.max ?? 1000000),
          };
        }
      }
    });

    return NextResponse.json({ limits });
  } catch (error: any) {
    console.error("Failed to fetch SMM services:", error.message);
    // Fall back to default safe minimums
    return NextResponse.json({
      limits: {
        views: { min: 100, max: 10000000 },
        likes: { min: 10, max: 500000 },
        saves: { min: 10, max: 500000 },
        shares: { min: 10, max: 500000 },
        comments: { min: 5, max: 1000 },
      },
      warning: "Offline fallback limits applied"
    });
  }
}
