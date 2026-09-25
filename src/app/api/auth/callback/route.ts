import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import dns from "node:dns";

// Force IPv4 resolution to prevent serverless container fetch timeouts
dns.setDefaultResultOrder("ipv4first");

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.yoyosmm.online";

  const response = NextResponse.redirect(`${baseUrl}${next}`);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, { ...options, path: "/", sameSite: "lax", secure: true });
                response.cookies.set(name, value, { ...options, path: "/", sameSite: "lax", secure: true });
              });
            } catch {
              // Server component / route handler cookie catch
            }
          },
        },
      }
    );

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[OAuth Callback] Code exchange failed:", error);
        return NextResponse.redirect(`${baseUrl}/login?error=auth-callback-failed&msg=${encodeURIComponent(error.message)}`);
      }

      const user = data?.user || (await supabase.auth.getUser()).data.user;

      if (user && user.email) {
        // Sync user to PostgreSQL database
        let dbUser = await prisma.user.findUnique({
          where: { supabaseId: user.id }
        });

        if (!dbUser) {
          dbUser = await prisma.user.findUnique({
            where: { email: user.email }
          });

          if (dbUser) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { supabaseId: user.id }
            });
            console.log(`[OAuth Callback] Linked existing email ${user.email} to supabaseId ${user.id}`);
          } else {
            await prisma.user.create({
              data: {
                supabaseId: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split("@")[0] || "User",
                phone: user.user_metadata?.phone || null,
                avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                plan: "FREE",
                trialEndsAt: null,
                walletMode: true,
                balance: 0,
                bonusBalance: 0,
              }
            });
            console.log(`[OAuth Callback] Created new user for email ${user.email}`);
          }
        }

        if (data?.session) {
          response.cookies.set("sb-access-token", data.session.access_token, {
            path: "/",
            sameSite: "lax",
            secure: true,
          });
          response.cookies.set("sb-refresh-token", data.session.refresh_token, {
            path: "/",
            sameSite: "lax",
            secure: true,
          });
        }
      }

      return response;
    } catch (e: any) {
      console.error("[OAuth Callback] Unexpected error:", e);
      return NextResponse.redirect(`${baseUrl}/login?error=auth-callback-failed&msg=${encodeURIComponent(e.message || String(e))}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth-callback-failed&msg=no-code-provided`);
}
