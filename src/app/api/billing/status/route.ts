import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/** GET /api/billing/status — returns current plan and wallet addresses */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [settings, payments, cryptoPayments] = await Promise.all([
    prisma.adminSettings.findUnique({ where: { id: "global" } }),
    prisma.upiPayment.findMany({ where: { userId: dbUser.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.cryptoPayment.findMany({ where: { userId: dbUser.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return NextResponse.json({
    plan: dbUser.plan,
    lifetimeUnlocked: dbUser.lifetimeUnlocked,
    walletMode: dbUser.walletMode,
    balance: dbUser.balance,
    bonusBalance: dbUser.bonusBalance,
    payments,
    cryptoPayments,
    wallet: {
      trc20: settings?.trc20Address ?? null,
      bep20: settings?.bep20Address ?? null,
      priceUsdt: settings?.priceUsdt ?? 20,
      upiId: settings?.upiId ?? null,
      upiQrCode: settings?.upiQrCode ?? null,
      minDeposit: settings?.minDeposit ?? 500.0,
    },
  });
}

