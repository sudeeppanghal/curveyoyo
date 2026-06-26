import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/** GET /api/billing/status — returns current plan and wallet addresses */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser, settings] = await Promise.all([
    prisma.user.findUnique({ where: { supabaseId: user.id }, include: { cryptoPayments: { orderBy: { createdAt: "desc" }, take: 5 } } }),
    prisma.adminSettings.findUnique({ where: { id: "global" } }),
  ]);

  return NextResponse.json({
    plan: dbUser?.plan ?? "FREE",
    lifetimeUnlocked: dbUser?.lifetimeUnlocked ?? false,
    payments: dbUser?.cryptoPayments ?? [],
    wallet: {
      trc20: settings?.trc20Address ?? null,
      bep20: settings?.bep20Address ?? null,
      priceUsdt: settings?.priceUsdt ?? 20,
    },
  });
}
