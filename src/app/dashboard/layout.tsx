"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  {
    href: "/dashboard", label: "Overview",
    icon: (a: boolean) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a ? "#F59E0B" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/reels", label: "Reels",
    icon: (a: boolean) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a ? "#F59E0B" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
      </svg>
    ),
  },
  {
    href: "/orders", label: "Orders",
    icon: (a: boolean) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a ? "#F59E0B" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    href: "/panels", label: "Panels",
    icon: (a: boolean) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a ? "#F59E0B" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    href: "/analytics", label: "Analytics",
    icon: (a: boolean) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a ? "#F59E0B" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: "/billing", label: "Billing",
    icon: (a: boolean) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a ? "#F59E0B" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    href: "/settings", label: "Settings",
    icon: (a: boolean) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a ? "#F59E0B" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userName, setUserName] = useState("U");

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 1024);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName((user.user_metadata?.name || user.email || "U")[0].toUpperCase());
    });
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await createClient().auth.signOut();
    router.push("/");
  };

  const pageTitle = NAV.find(n => n.href === pathname || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label ?? "Dashboard";

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#0a0a0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#fff", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .nav-link:hover { background: rgba(255,255,255,0.05) !important; color: #e2e8f0 !important; }
        .nav-link:hover svg { color: #e2e8f0; }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 232, minWidth: 232, height: "100vh",
        position: isMobile ? "fixed" : "sticky", top: 0, left: 0, zIndex: 50,
        display: "flex", flexDirection: "column",
        background: "rgba(255,255,255,0.018)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-232px)") : "none",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {/* Logo */}
        <div style={{ padding: "18px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 13, color: "#08080c", flexShrink: 0,
              boxShadow: "0 4px 12px rgba(245,158,11,0.35)"
            }}>Y</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", letterSpacing: "-0.3px" }}>YoyoSMM</div>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 500, marginTop: 1 }}>Organic Delivery</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ padding: "6px 6px 4px", fontSize: 10, fontWeight: 600, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Main Menu
          </div>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className="nav-link"
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10,
                  fontSize: 13, fontWeight: active ? 600 : 500, textDecoration: "none", transition: "all 0.15s",
                  background: active ? "rgba(245,158,11,0.1)" : "transparent",
                  color: active ? "#F59E0B" : "#64748b",
                  border: active ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent",
                }}>
                {icon(active)}
                <span>{label}</span>
                {active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "#F59E0B" }} />}
              </Link>
            );
          })}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "8px 4px" }} />

          {/* New Order CTA */}
          <Link href="/reels/new" style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
            fontSize: 13, fontWeight: 700, textDecoration: "none", color: "#08080c",
            background: "linear-gradient(135deg, #F59E0B, #F97316)",
            boxShadow: "0 4px 14px rgba(245,158,11,0.25)",
            margin: "2px 0",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#08080c" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Order
          </Link>
        </nav>

        {/* Trial badge + Logout */}
        <div style={{ padding: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/billing" style={{
            textDecoration: "none", borderRadius: 10, padding: "10px 12px",
            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⚡</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B" }}>Free Trial Active</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>Upgrade → $20 lifetime</div>
            </div>
          </Link>
          <button onClick={handleLogout} disabled={loggingOut} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 10,
            fontSize: 12, fontWeight: 500, background: "transparent", border: "1px solid rgba(239,68,68,0.15)",
            cursor: "pointer", color: loggingOut ? "#475569" : "#ef4444", transition: "all 0.15s",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top header */}
        <header style={{
          position: "sticky", top: 0, zIndex: 30,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 56,
          background: "rgba(10,10,15,0.9)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
                background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8,
                color: "#64748b", display: "flex", alignItems: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <div>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{pageTitle}</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/reels/new" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9,
              fontSize: 12, fontWeight: 700, textDecoration: "none", color: "#08080c",
              background: "linear-gradient(135deg, #F59E0B, #F97316)",
              boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#08080c" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Order
            </Link>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, background: "linear-gradient(135deg, #F59E0B, #F97316)", color: "#08080c",
              boxShadow: "0 4px 10px rgba(245,158,11,0.3)",
            }}>{userName}</div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "28px 28px", overflowY: "auto", maxWidth: 1200 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
