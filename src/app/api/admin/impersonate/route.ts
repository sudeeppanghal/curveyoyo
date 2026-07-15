import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  const expected = process.env.ADMIN_SECRET;

  console.log("IMPERSONATE ENDPOINT CALLED");
  console.log("secret header:", secret);
  console.log("expected secret:", expected);
  console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "defined" : "undefined");

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const supabase = await createServiceClient();

    // 1. Generate a magic link OTP (without sending email)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
    });

    if (error) throw error;

    const otp = data.properties.email_otp;
    if (!otp) {
      throw new Error("No OTP found in generated link");
    }

    // 2. Verify the OTP on the server using standard client (cookie-enabled)
    const clientSupabase = await createClient();
    const { error: verifyError } = await clientSupabase.auth.verifyOtp({
      email: user.email,
      token: otp,
      type: "magiclink",
    });

    if (verifyError) throw verifyError;

    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (err: any) {
    console.error("Impersonation error:", err);
    return NextResponse.json({ error: err.message || "Failed to impersonate" }, { status: 500 });
  }
}
