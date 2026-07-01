import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
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
    await prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        email: authData.user.email!,
        name,
        plan: "FREE",
        trialEndsAt: null,
        walletMode: true,
        balance: 0.0,
      },
    });


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
