import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7880552291:AAGad9XL6ZeilBxFheCbZKALEzy9elpY6H4";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.ADMIN_SECRET;

export async function GET(request: NextRequest) {
  // Simple auth to prevent randoms from messing with the webhook
  const secretQuery = request.nextUrl.searchParams.get("secret");
  if (secretQuery !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine the base URL dynamically based on the request host
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: SECRET,
        allowed_updates: ["callback_query"]
      }),
    });

    const data = await response.json();
    return NextResponse.json({
      success: data.ok,
      description: data.description,
      webhookUrl
    });
  } catch (error) {
    console.error("[Telegram Register Error]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
