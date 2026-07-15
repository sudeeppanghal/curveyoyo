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
    const requestOrigin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone },
        emailRedirectTo: `${requestOrigin}/api/auth/callback`,
      },
    });

    if (authError) {
      // Safely extract message — Supabase errors are sometimes objects, not plain strings
      const errMsg = typeof authError.message === "string" && authError.message
        ? authError.message
        : JSON.stringify(authError);
      console.error("[signup:supabase-error]", JSON.stringify(authError));
      if (errMsg.toLowerCase().includes("already registered") || errMsg.toLowerCase().includes("already been registered")) {
        return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 409 });
      }
      if (errMsg.toLowerCase().includes("email rate limit") || errMsg.toLowerCase().includes("over_email_send_rate_limit")) {
        return NextResponse.json({ error: "Too many signups attempted. Please wait a few minutes and try again." }, { status: 429 });
      }
      if (errMsg.toLowerCase().includes("email signups are disabled")) {
        return NextResponse.json({ error: "Email signup is currently disabled. Please contact support." }, { status: 403 });
      }
      return NextResponse.json({ error: errMsg || "Signup failed. Please try again." }, { status: 400 });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[signup:catch]", message);
    return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500 });
  }
}
