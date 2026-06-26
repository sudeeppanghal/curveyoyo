"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard",   icon: "📊", label: "Overview" },
  { href: "/reels",       icon: "🎬", label: "Reels" },
  { href: "/orders",      icon: "📋", label: "Orders" },
  { href: "/panels",      icon: "🔌", label: "Panels" },
  { href: "/analytics",   icon: "📈", label: "Analytics" },
  { href: "/billing",     icon: "💳", label: "Billing" },
  { href: "/settings",    icon: "⚙️",  label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex" style={{background:"#0B0B0F"}}>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={()=>setSidebarOpen(false)} />
      )}

      {/* ══════════════════════════════════
          SIDEBAR
      ══════════════════════════════════ */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{width:"240px",background:"rgba(255,255,255,0.02)",borderRight:"1px solid rgba(255,255,255,0.06)"}}>

        {/* Logo */}
        <div className="p-5 border-b" style={{borderColor:"rgba(255,255,255,0.06)"}}>
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{background:"#F59E0B",color:"#0B0B0F"}}>Y</div>
            <span className="font-semibold text-white">YoyoSMM</span>
          </Link>
        </div>

        {/* Trial / Plan Banner */}
        <div className="mx-3 mt-3">
          <div className="rounded-xl p-3 text-center" style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)"}}>
            <p className="text-xs font-semibold text-amber-400">⏳ 1-Day Free Trial</p>
            <Link href="/billing" className="text-xs text-gray-400 hover:text-amber-400 mt-0.5 block">Upgrade → $20 lifetime</Link>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-2">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={()=>setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${active ? "" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                style={active ? {background:"rgba(245,158,11,0.12)",color:"#F59E0B",border:"1px solid rgba(245,158,11,0.2)"} : {}}>
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom logout */}
        <div className="p-3 border-t" style={{borderColor:"rgba(255,255,255,0.06)"}}>
          <button onClick={handleLogout} disabled={loggingOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-60">
            <span className="text-base">🚪</span>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════
          MAIN AREA
      ══════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b" style={{background:"rgba(11,11,15,0.9)",backdropFilter:"blur(12px)",borderColor:"rgba(255,255,255,0.06)"}}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition" onClick={()=>setSidebarOpen(!sidebarOpen)}>
              <span className="text-xl">☰</span>
            </button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-white capitalize">
                {pathname.split("/").filter(Boolean).pop() || "dashboard"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/reels/new" className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#0B0B0F] transition-all hover:opacity-90" style={{background:"#F59E0B"}}>
              + New Order
            </Link>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{background:"rgba(245,158,11,0.15)",color:"#F59E0B"}}>U</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
