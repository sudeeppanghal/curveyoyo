import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resetToken, newPassword } = body;

    if (!resetToken || !newPassword || typeof newPassword !== "string") {
      return NextResponse.json({ error: "Reset token and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const redis = getRedis();
    const tokenKey = `reset_token:${resetToken}`;
    const email = await redis.get<string>(tokenKey);

    if (!email) {
      return NextResponse.json({ error: "Reset session expired. Please request a new OTP code." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    // Update password in Supabase Auth via Admin Service Role Client
    const supabase = await createServiceClient();
    const { error: authError } = await supabase.auth.admin.updateUserById(
      user.supabaseId,
      { password: newPassword.trim() }
    );

    if (authError) {
      console.error("[OTP:reset-supabase-error]", authError);
      return NextResponse.json({ error: authError.message || "Failed to update password." }, { status: 400 });
    }

    // Invalidate resetToken after single use
    await redis.del(tokenKey);

    console.log(`[OTP] Password reset successfully for ${email}`);

    return NextResponse.json({
      ok: true,
      message: "Password reset successfully! Redirecting to login...",
    });
  } catch (err: any) {
    console.error("[OTP:reset-error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to reset password." },
      { status: 500 }
    );
  }
}
