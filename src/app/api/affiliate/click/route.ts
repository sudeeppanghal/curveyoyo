import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { ref } = await request.json();
    if (!ref || typeof ref !== "string") {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }

    const affiliate = await prisma.user.findFirst({
      where: {
        OR: [
          { affiliateCode: ref },
          { id: ref },
          { email: ref }
        ]
      }
    });

    if (affiliate) {
      await prisma.user.update({
        where: { id: affiliate.id },
        data: { affiliateClicks: { increment: 1 } }
      });
      return NextResponse.json({ success: true, code: affiliate.affiliateCode || affiliate.id });
    }

    return NextResponse.json({ success: false, error: "Affiliate not found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
