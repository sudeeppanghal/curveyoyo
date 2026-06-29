import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handles Supabase OAuth callback (Google sign-in redirect)
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Fetch authenticated user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Sync user to PostgreSQL database if missing
        const dbUser = await prisma.user.findUnique({
          where: { supabaseId: user.id }
        });

        if (!dbUser) {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 1); // 1-day trial

          await prisma.user.create({
            data: {
              supabaseId: user.id,
              email: user.email!,
              name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
              plan: "TRIAL",
              trialEndsAt,
              walletMode: true,
              balance: 0.0,
            }
          });

        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
