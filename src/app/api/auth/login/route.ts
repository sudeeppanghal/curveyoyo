import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Ensure database user is linked
    if (data.user && data.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.user.email }
      });
      if (existingUser && !existingUser.supabaseId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { supabaseId: data.user.id }
        });
      }
    }

    const isHttps = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";

    const resObj = NextResponse.json({
      success: true,
      user: { id: data.user.id, email: data.user.email },
      redirectTo: "/dashboard",
    });

    if (data.session) {
      resObj.cookies.set("sb-access-token", data.session.access_token, {
        path: "/",
        sameSite: "lax",
        secure: isHttps,
      });
      resObj.cookies.set("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        sameSite: "lax",
        secure: isHttps,
      });
    }

    return resObj;
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
