import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify user exists in DB
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json({ error: "No account found with this email address." }, { status: 404 });
    }

    const redis = getRedis();

    // 2. Check 60-second rate limit cooldown
    const cooldownKey = `otp_cooldown:${cleanEmail}`;
    const isCooling = await redis.get(cooldownKey);
    if (isCooling) {
      return NextResponse.json({ error: "Please wait 60 seconds before requesting another OTP." }, { status: 429 });
    }

    // 3. Generate 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Save to Redis (10-minute expiration) and set 60-second cooldown
    await redis.setex(`otp_code:${cleanEmail}`, 600, JSON.stringify({ code: otpCode, attempts: 0 }));
    await redis.setex(cooldownKey, 60, "1");

    // 5. Send OTP Email via Resend multi-key rotation
    await sendOtpEmail(cleanEmail, otpCode);

    console.log(`[OTP] Successfully generated and sent 6-digit OTP to ${cleanEmail}`);

    return NextResponse.json({
      ok: true,
      message: "6-digit OTP sent successfully to your email!",
    });
  } catch (err: any) {
    console.error("[OTP:send-error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to send OTP email. Please try again." },
      { status: 500 }
    );
  }
}
