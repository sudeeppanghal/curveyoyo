import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import dns from "node:dns";

// Force IPv4 resolution to prevent serverless container fetch timeouts to Supabase Auth
dns.setDefaultResultOrder("ipv4first");

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

  // Create a response object first to receive the cookies correctly
  const response = NextResponse.redirect(`${baseUrl}${next}`);

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
        return NextResponse.redirect(`${baseUrl}/login?error=auth-callback-failed&msg=${encodeURIComponent(errMsg)}`);
      }

      // Sync user to PostgreSQL database if missing
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        // 1. Try to find user by supabaseId first
        let dbUser = await prisma.user.findUnique({
          where: { supabaseId: user.id }
        });

        // 2. If not found, try to find user by email to link accounts
        if (!dbUser) {
          dbUser = await prisma.user.findUnique({
            where: { email: user.email }
          });

          if (dbUser) {
            // Link existing user to this supabaseId
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { supabaseId: user.id }
            });
            console.log(`Linked existing user email ${user.email} to supabaseId ${user.id}`);
          } else {
            // 3. Create new user if neither exists
            await prisma.user.create({
              data: {
                supabaseId: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.email.split("@")[0] || "User",
                phone: user.user_metadata?.phone || null,
                plan: "FREE",
                trialEndsAt: null,
                walletMode: true,
                balance: 0.0,
              }
            });
            console.log(`Created new user email ${user.email} with supabaseId ${user.id}`);
          }
        }
      }
      
      return response;
    } catch (e: any) {
      console.error("Callback exception:", e);
      return NextResponse.redirect(`${baseUrl}/login?error=auth-callback-failed&msg=${encodeURIComponent(e.message || String(e))}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth-callback-failed&msg=no-code-provided`);
}
