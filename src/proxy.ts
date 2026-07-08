import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // Redirect naked domain to www.yoyosmm.online to prevent cookie subdomain issues
  if (host === "yoyosmm.online") {
    return NextResponse.redirect(`https://www.yoyosmm.online${url.pathname}${url.search}`, 301);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
