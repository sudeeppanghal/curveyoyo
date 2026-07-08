import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone, referredBy } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Create Supabase auth user
    const requestOrigin = request.nextUrl.origin;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone },
        emailRedirectTo: `${requestOrigin}/api/auth/callback`,
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    // 2. Create user record in Prisma (Wallet Mode)
    let affiliateCodeToSet = undefined;
    if (email.toLowerCase() === "bizanomarketing.carrd.co@gmail.com") {
      affiliateCodeToSet = "BIZANO20";
    }

    const newUser = await prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        email: authData.user.email!,
        name,
        phone: phone || null,
        plan: "FREE",
        trialEndsAt: null,
        walletMode: true,
        balance: 0.0,
        referredBy: referredBy && typeof referredBy === "string" ? referredBy.toUpperCase() : undefined,
        affiliateCode: affiliateCodeToSet,
      },
    });

    if (referredBy && typeof referredBy === "string") {
      const affiliateUser = await prisma.user.findFirst({
        where: {
          OR: [
            { affiliateCode: referredBy.toUpperCase() },
            { id: referredBy }
          ]
        }
      });
      if (affiliateUser) {
        await prisma.affiliateTransaction.create({
          data: {
            affiliateId: affiliateUser.id,
            referredUserId: newUser.id,
            amountDeposit: 0,
            commissionEarned: 0,
            type: "SIGNUP"
          }
        }).catch(() => {});
      }
    }


    return NextResponse.json({
      success: true,
      message: "Account created. Check your email to confirm.",
      user: { id: authData.user.id, email: authData.user.email },
    });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
