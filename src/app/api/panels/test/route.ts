import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Test if an SMM panel API is reachable and credentials are valid
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { apiUrl, apiKey } = await request.json();
  if (!apiUrl || !apiKey) {
    return NextResponse.json({ error: "apiUrl and apiKey required" }, { status: 400 });
  }

  const cleanUrl = apiUrl.trim().replace(/\/$/, "");

  try {
    // Standard SMM API: action=balance returns account balance
    const response = await fetch(cleanUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: apiKey, action: "balance" }).toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, message: `Panel returned HTTP ${response.status}` }, { status: 200 });
    }

    const text = await response.text();
    let data: Record<string, unknown>;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json({ ok: false, message: "Panel returned non-JSON response. Check the API URL." }, { status: 200 });
    }

    if (data.error) {
      return NextResponse.json({ ok: false, message: `Panel error: ${data.error}` }, { status: 200 });
    }

    const balance = data.balance ?? data.funds ?? "unknown";
    return NextResponse.json({ ok: true, message: `✓ Connection successful! Balance: ${balance}`, balance }, { status: 200 });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("timeout") || errMsg.includes("abort")) {
      return NextResponse.json({ ok: false, message: "Connection timed out. Check the API URL." }, { status: 200 });
    }
    return NextResponse.json({ ok: false, message: "Could not reach panel. Check API URL." }, { status: 200 });
  }
}
