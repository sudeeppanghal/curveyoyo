import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp || typeof otp !== "string") {
      return NextResponse.json({ error: "Email and 6-digit OTP are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.trim();

    const redis = getRedis();
    const otpKey = `otp_code:${cleanEmail}`;
    const rawData = await redis.get<string | object>(otpKey);

    if (!rawData) {
      return NextResponse.json({ error: "OTP has expired or does not exist. Please request a new code." }, { status: 400 });
    }

    let parsedData: { code: string; attempts: number };
    try {
      parsedData = typeof rawData === "string" ? JSON.parse(rawData) : (rawData as any);
    } catch {
      parsedData = { code: String(rawData), attempts: 0 };
    }

    if (parsedData.attempts >= 5) {
      await redis.del(otpKey);
      return NextResponse.json({ error: "Too many invalid attempts. Please request a new OTP code." }, { status: 429 });
    }

    if (parsedData.code !== cleanOtp) {
      parsedData.attempts += 1;
      await redis.setex(otpKey, 600, JSON.stringify(parsedData));
      return NextResponse.json({ error: "Invalid 6-digit OTP code. Please check and try again." }, { status: 400 });
    }

    // OTP is valid! Create single-use resetToken (15m expiration)
    const resetToken = crypto.randomBytes(24).toString("hex");
    await redis.setex(`reset_token:${resetToken}`, 900, cleanEmail);

    // Delete verified OTP code
    await redis.del(otpKey);

    console.log(`[OTP] Successfully verified OTP for ${cleanEmail}`);

    return NextResponse.json({
      ok: true,
      resetToken,
      message: "OTP verified successfully!",
    });
  } catch (err: any) {
    console.error("[OTP:verify-error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
