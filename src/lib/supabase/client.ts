import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: isHttps,
      }
    }
  );
}
