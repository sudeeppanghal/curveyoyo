import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureSpecialAffiliateAccount } from "@/lib/affiliate";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const targetEmail = request.nextUrl.searchParams.get("email");
    const targetCode = request.nextUrl.searchParams.get("code");
    const isAdmin = request.headers.get("x-admin-secret") === process.env.ADMIN_SECRET || dbUser.email === "admin@yoyosmm.com" || dbUser.email.includes("admin");

    let targetUser = dbUser;
    if ((targetEmail || targetCode) && isAdmin) {
      const found = await prisma.user.findFirst({
        where: targetEmail ? { email: targetEmail } : { affiliateCode: targetCode! }
      });
      if (found) targetUser = found;
    }

    if (targetUser.email.toLowerCase() === "bizanomarketing.carrd.co@gmail.com" && !targetUser.affiliateCode) {
      await ensureSpecialAffiliateAccount(targetUser.email, targetUser.id);
      targetUser.affiliateCode = "BIZANO20";
    }

    // Find all referred users
    const referredUsers = await prisma.user.findMany({
      where: {
        OR: [
          { referredBy: targetUser.affiliateCode || targetUser.id },
          { referredBy: targetUser.email },
          { referredBy: targetUser.id }
        ]
      },
      select: { id: true, name: true, email: true, balance: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    const transactions = await prisma.affiliateTransaction.findMany({
      where: { affiliateId: targetUser.id },
      include: {
        referredUser: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      success: true,
      affiliate: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        affiliateCode: targetUser.affiliateCode || (targetUser.email.toLowerCase() === "bizanomarketing.carrd.co@gmail.com" ? "BIZANO20" : targetUser.id),
        clicks: targetUser.affiliateClicks,
        earnings: targetUser.affiliateEarnings,
        balance: targetUser.balance,
      },
      referredUsers,
      transactions
    });
  } catch (err) {
    console.error("[affiliate stats]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
