import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const vars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ SET" : "❌ MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ SET" : "❌ MISSING",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ SET" : "❌ MISSING",
    DATABASE_URL: process.env.DATABASE_URL ? "✅ SET" : "❌ MISSING",
    DIRECT_URL: process.env.DIRECT_URL ? "✅ SET" : "❌ MISSING",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✅ SET" : "❌ MISSING",
    QSTASH_TOKEN: process.env.QSTASH_TOKEN ? "✅ SET" : "❌ MISSING",
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? "✅ SET" : "❌ MISSING",
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? "✅ SET" : "❌ MISSING",
    RESEND_API_KEY: process.env.RESEND_API_KEY ? "✅ SET" : "❌ MISSING",
    NODE_ENV: process.env.NODE_ENV,
  };

  // Try connecting to supabase
  let supabaseStatus = "not tested";
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await client.auth.getSession();
    supabaseStatus = error ? `❌ Error: ${error.message}` : "✅ Connected";
  } catch (e: unknown) {
    supabaseStatus = `❌ Threw: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({ vars, supabaseStatus }, { status: 200 });
}
