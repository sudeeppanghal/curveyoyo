import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "";
  let maskedDb = "not set";
  try {
    if (dbUrl) {
      const u = new URL(dbUrl.replace("postgresql://", "http://"));
      maskedDb = `${u.hostname}:${u.port}${u.pathname}`;
    }
  } catch (e) {
    maskedDb = "error parsing";
  }

  const vars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ SET" : "❌ MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ SET" : "❌ MISSING",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ SET" : "❌ MISSING",
    DATABASE_URL: maskedDb,
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json({ vars }, { status: 200 });
}
