import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { imageUrl, title, description, targetLink, offerEnabled, minDeposit, bonusPercent, endsAt } = body;

    const announcement = await prisma.announcement.upsert({
      where: { id: "active" },
      create: {
        id: "active",
        imageUrl,
        title,
        description,
        targetLink,
        offerEnabled: !!offerEnabled,
        minDeposit: minDeposit !== undefined ? parseFloat(minDeposit) : 2000,
        bonusPercent: bonusPercent !== undefined ? parseFloat(bonusPercent) : 100,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
      update: {
        imageUrl,
        title,
        description,
        targetLink,
        offerEnabled: !!offerEnabled,
        minDeposit: minDeposit !== undefined ? parseFloat(minDeposit) : 2000,
        bonusPercent: bonusPercent !== undefined ? parseFloat(bonusPercent) : 100,
        endsAt: endsAt ? new Date(endsAt) : null,
      }
    });

    return NextResponse.json({ ok: true, announcement });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
