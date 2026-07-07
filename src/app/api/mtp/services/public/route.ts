import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/mtp/services/public
 * User-facing endpoint. Returns active services when MTP mode is on.
 * Requires authenticated user session.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if MTP mode is active
  const settings = await prisma.adminSettings.findUnique({
    where: { id: "global" },
    select: { mtpMode: true },
  });
  if (!settings?.mtpMode) {
    return NextResponse.json({ services: [], categories: [] });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 200;

  const where: Record<string, unknown> = { isActive: true };
  if (category) where.category = category;

  const [services, categories] = await Promise.all([
    prisma.mtpService.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        serviceId: true,
        name: true,
        category: true,
        type: true,
        customRate: true,
        minOrder: true,
        maxOrder: true,
      },
    }),
    prisma.mtpService.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  return NextResponse.json({
    services,
    categories: categories.map((c) => c.category),
  });
}
