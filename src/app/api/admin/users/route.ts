import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

/** GET /api/admin/users — list all users with stats */
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, panels: true } },
      subscription: { select: { status: true, paidAt: true } },
    },
    take: 200,
  });

  return NextResponse.json({ users });
}

/** PATCH /api/admin/users — upgrade, suspend, toggle wallet mode, or update balance */
export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { userId, action, balance } = body as { userId: string; action: "upgrade" | "suspend" | "unsuspend" | "toggleWalletMode" | "updateBalance"; balance?: number };
  
  if (!userId || !action) return NextResponse.json({ error: "userId and action required" }, { status: 400 });

  if (action === "upgrade") {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { plan: "LIFETIME", lifetimeUnlocked: true } }),
      prisma.subscription.upsert({
        where: { userId },
        create: { userId, amount: 2000, currency: "usdt", status: "ACTIVE", paidAt: new Date() },
        update: { status: "ACTIVE", paidAt: new Date() },
      }),
    ]);
  } else if (action === "suspend") {
    await prisma.user.update({ where: { id: userId }, data: { plan: "SUSPENDED" as Plan } });
  } else if (action === "unsuspend") {
    await prisma.user.update({ where: { id: userId }, data: { plan: Plan.TRIAL } });
  } else if (action === "toggleWalletMode") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await prisma.user.update({
      where: { id: userId },
      data: { walletMode: !user.walletMode }
    });
  } else if (action === "updateBalance") {
    if (balance === undefined || isNaN(Number(balance))) {
      return NextResponse.json({ error: "Valid balance amount required" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { balance: parseFloat(Number(balance).toFixed(2)) }
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
