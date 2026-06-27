"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard",  icon: "📊", label: "Overview" },
  { href: "/reels",      icon: "🎬", label: "Reels" },
  { href: "/orders",     icon: "📋", label: "Orders" },
  { href: "/panels",     icon: "🔌", label: "Panels" },
  { href: "/analytics",  icon: "📈", label: "Analytics" },
  { href: "/billing",    icon: "💳", label: "Billing" },
  { href: "/settings",   icon: "⚙️",  label: "Settings" },
];

const C = {
  bg: "#08080c",
  sidebar: "rgba(255,255,255,0.015)",
  border: "rgba(255,255,255,0.07)",
  amber: "#F59E0B",
  text: "#ffffff",
  muted: "#94a3b8",
  faint: "#475569",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 1024);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const currentPage = pathname.split("/").filter(Boolean).pop() || "dashboard";
  const SIDEBAR_W = 240;

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:C.bg, fontFamily:"Inter,-apple-system,sans-serif", color:C.text, position:"relative" }}>

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", inset:0, zIndex:40, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(2px)" }}
        />
      )}

      {/* ═══════ SIDEBAR ═══════ */}
      <aside style={{
        width: SIDEBAR_W,
        minWidth: SIDEBAR_W,
        height: "100vh",
        position: isMobile ? "fixed" : "sticky",
        top: 0,
        left: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : `translateX(-${SIDEBAR_W}px)`) : "none",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}>

        {/* Logo */}
        <div style={{ padding:"20px 16px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <Link href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#F59E0B,#F97316)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:"#08080c", flexShrink:0 }}>Y</div>
            <span style={{ fontWeight:700, fontSize:16, color:C.text }}>YoyoSMM</span>
          </Link>
        </div>

        {/* Trial banner */}
        <div style={{ padding:"12px 12px 0" }}>
          <div style={{ borderRadius:12, padding:"10px 12px", textAlign:"center", background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.2)" }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.amber, margin:0 }}>⏳ 1-Day Free Trial</p>
            <Link href="/billing" style={{ fontSize:11, color:C.muted, textDecoration:"none", display:"block", marginTop:3 }}>Upgrade → $20 lifetime</Link>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:"auto", padding:"12px 10px", display:"flex", flexDirection:"column", gap:3 }}>
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)} style={{
                display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12,
                fontSize:13, fontWeight:500, textDecoration:"none", transition:"all 0.15s",
                background: active ? "rgba(245,158,11,0.1)" : "transparent",
                color: active ? C.amber : C.muted,
                border: active ? "1px solid rgba(245,158,11,0.18)" : "1px solid transparent",
              }}>
                <span style={{ fontSize:16 }}>{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding:"10px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
          <button onClick={handleLogout} disabled={loggingOut} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 12px", borderRadius:12,
            fontSize:13, fontWeight:500, background:"transparent", border:"none", cursor:"pointer",
            color: loggingOut ? C.faint : "#ef4444", transition:"all 0.15s",
          }}>
            <span style={{ fontSize:16 }}>🚪</span>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ═══════ MAIN AREA ═══════ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, marginLeft: !isMobile ? 0 : 0 }}>

        {/* Top header */}
        <header style={{
          position:"sticky", top:0, zIndex:30,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 20px", height:56,
          background:"rgba(8,8,12,0.92)", backdropFilter:"blur(12px)",
          borderBottom:`1px solid ${C.border}`, flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Hamburger - mobile */}
            {isMobile && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background:"none", border:"none", cursor:"pointer", padding:8, borderRadius:8, color:C.muted, fontSize:18, display:"flex" }}>
                ☰
              </button>
            )}
            <h1 style={{ fontSize:14, fontWeight:600, color:C.text, margin:0, textTransform:"capitalize" }}>
              {currentPage}
            </h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Link href="/reels/new" style={{
              display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10,
              fontSize:13, fontWeight:700, textDecoration:"none", color:"#08080c",
              background:"linear-gradient(135deg,#F59E0B,#F97316)",
            }}>
              + New Order
            </Link>
            <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, background:"rgba(245,158,11,0.12)", color:C.amber }}>U</div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex:1, padding:"24px 24px", overflowY:"auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
