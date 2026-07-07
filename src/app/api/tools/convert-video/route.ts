import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /api/tools/convert-video — Secure server-side relay to Hugging Face crop engine */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url, start, duration, aspect, reframe, mode } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
    }

    const SECRET = "yoyosmm_shorts_secret_abc123";
    const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

    let targetUrl = "";
    if (mode === "auto") {
      targetUrl = `https://jaatram-yoyo-shorts.hf.space/auto-shorts?url=${encodeURIComponent(url)}&gemini_key=${encodeURIComponent(GEMINI_KEY)}&aspect=${aspect}&reframe=${reframe !== false}&secret=${SECRET}`;
    } else {
      targetUrl = `https://jaatram-yoyo-shorts.hf.space/crop?url=${encodeURIComponent(url)}&start=${encodeURIComponent(start || "00:00")}&duration=${duration || 30}&aspect=${aspect || "9:16"}&reframe=${reframe !== false}&secret=${SECRET}`;
    }

    console.log(`Relaying job for user ${user.id}. Mode: ${mode}, Target: https://jaatram-yoyo-shorts.hf.space`);
    
    const response = await fetch(targetUrl, {
      method: "GET",
      // Avoid long caching for dynamic video generation jobs
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Hugging Face Space returned: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Relay to Hugging Face Failed:", error);
    return NextResponse.json({ error: error.message || "Failed to contact conversion service" }, { status: 500 });
  }
}
