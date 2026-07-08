import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Create a response object first to receive the cookies correctly
  const response = NextResponse.redirect(`${requestUrl.origin}${next}`);

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Parse headers directly from the incoming request to ensure stability
            const cookieHeader = request.headers.get("cookie") || "";
            const list: Record<string, string> = {};
            cookieHeader.split(";").forEach((cookie) => {
              const parts = cookie.split("=");
              const name = parts.shift();
              if (name) {
                list[name.trim()] = decodeURI(parts.join("="));
              }
            });
            return Object.entries(list).map(([name, value]) => ({ name, value }));
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Apply the auth cookies directly to the redirection response
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Supabase code exchange failed:", error);
        const errMsg = `Name: ${error.name || 'Unknown'}, Status: ${error.status || 'None'}, Msg: ${error.message || 'None'}`;
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth-callback-failed&msg=${encodeURIComponent(errMsg)}`);
      }

      // Sync user to PostgreSQL database if missing
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { supabaseId: user.id }
        });

        if (!dbUser) {
          await prisma.user.create({
            data: {
              supabaseId: user.id,
              email: user.email!,
              name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
              plan: "FREE",
              trialEndsAt: null,
              walletMode: true,
              balance: 0.0,
            }
          });
        }
      }
      
      return response;
    } catch (e: any) {
      console.error("Callback exception:", e);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth-callback-failed&msg=${encodeURIComponent(e.message || String(e))}`);
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth-callback-failed&msg=no-code-provided`);
}
