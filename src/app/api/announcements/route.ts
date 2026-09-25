import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let announcement = await prisma.announcement.findUnique({
      where: { id: "active" }
    });

    if (!announcement) {
      announcement = await prisma.announcement.create({
        data: {
          id: "active",
          imageUrl: "/promo_deposit_banner.png",
          title: "100% DEPOSIT BONUS!",
          description: "Deposit ₹2,000 or more & get 100% bonus balance instantly! Offer is valid for 1 week.",
          targetLink: "/dashboard/billing",
          offerEnabled: true,
          minDeposit: 2000,
          bonusPercent: 100,
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
        }
      });
    }

    return NextResponse.json({ announcement });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
