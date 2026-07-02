"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/* ─── Whitish Neomorphism Design Tokens ───────────────────────── */
const N = {
  bg:        "#eef2f7",
  surface:   "#eef2f7",
  raised:    "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm:  "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:     "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:    "#d97706",
  accentBg:  "linear-gradient(135deg, #d97706, #ea580c)",
  text:      "#2d3748",
  muted:     "#718096",
  faint:     "#a0aec0",
  border:    "rgba(200, 208, 231, 0.4)",
};

const NAV = [
  { href: "/dashboard", label: "Overview",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { href: "/reels",    label: "Reels",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
  { href: "/orders",   label: "Orders",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
  { href: "/analytics", label: "Analytics",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { href: "/billing",  label: "Billing",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { href: "/tickets",  label: "Support",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { href: "/settings", label: "Settings",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut]   = useState(false);
  const [isMobile, setIsMobile]       = useState(false);
  const [userName, setUserName]       = useState("U");
  const [walletMode, setWalletMode]   = useState(false);
  const [balance, setBalance]         = useState(0.0);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 1024);
    fn(); window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName((user.user_metadata?.name || user.email || "U")[0].toUpperCase());
    });

    // Fetch wallet info
    fetch("/api/billing/status")
      .then(res => res.json())
      .then(data => {
        if (data) {
          setWalletMode(!!data.walletMode);
          setBalance(data.balance ?? 0.0);
        }
      })
      .catch(() => {});
  }, []);


  const handleLogout = async () => {
    setLoggingOut(true);
    await createClient().auth.signOut();
    router.push("/");
  };

  const pageTitle = NAV.find(n => n.href === pathname || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label ?? "Dashboard";

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:N.bg, fontFamily:"'Inter',-apple-system,sans-serif", color:N.text, position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:4px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .nav-link{transition:all 0.2s}
        .nav-link:hover{box-shadow:4px 4px 12px #c8d0e7,-2px -2px 8px #ffffff !important;color:${N.accent} !important}
        .neo-btn:hover{box-shadow:6px 6px 16px #c8d0e7,-3px -3px 10px #ffffff !important;transform:translateY(-1px)}
        .neo-btn:active{box-shadow:inset 3px 3px 8px #c8d0e7,inset -2px -2px 5px #ffffff !important;transform:translateY(0)}
        .neo-input:focus{box-shadow:inset 5px 5px 12px #c8d0e7,inset -3px -3px 8px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important;outline:none}
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, zIndex:40, background:"rgba(0,0,0,0.3)", backdropFilter:"blur(4px)" }} />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        width:232, minWidth:232, height:"100vh",
        position: isMobile ? "fixed" : "sticky", top:0, left:0, zIndex:50,
        display:"flex", flexDirection:"column",
        background: N.bg,
        boxShadow: "6px 0 20px #c8d0e7, -1px 0 0 rgba(0,0,0,0.02)",
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-232px)") : "none",
        transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {/* Logo */}
        <div style={{ padding:"20px 16px 18px", borderBottom:`1px solid ${N.border}` }}>
          <Link href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:10 }}>
            <img src="/logo.png" alt="YoyoSMM Logo" style={{ width: 38, height: 38, objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight:850, fontSize:15, color:N.text, letterSpacing:"-0.3px" }}>YoyoSMM</div>
              <div style={{ fontSize:10, color:N.muted, marginTop:1, fontWeight:700 }}>Organic Delivery</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:"auto", padding:"14px 12px", display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ padding:"4px 6px 8px", fontSize:10, fontWeight:800, color:N.faint, textTransform:"uppercase", letterSpacing:"0.1em" }}>
            Navigation
          </div>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className="nav-link"
                style={{
                  display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:12,
                  fontSize:13, fontWeight: active ? 800 : 600, textDecoration:"none",
                  color: active ? N.accent : N.muted,
                  boxShadow: active ? N.inset : "none",
                  background: N.bg,
                }}>
                <span style={{ color: active ? N.accent : N.muted, display:"flex" }}>{icon}</span>
                <span>{label}</span>
                {active && (
                  <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:N.accent, boxShadow:`0 0 6px ${N.accent}` }} />
                )}
              </Link>
            );
          })}

          <div style={{ height:1, background:N.border, margin:"10px 4px" }} />

          {/* New Order CTA */}
          <Link href="/reels/new" className="neo-btn"
            style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              padding:"11px 12px", borderRadius:12, textDecoration:"none",
              fontSize:13, fontWeight:800, color:"#ffffff",
              background: N.accentBg,
              boxShadow: N.raisedSm,
              cursor:"pointer", transition:"all 0.2s",
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Order
          </Link>
        </nav>

        {/* Trial + Logout */}
        <div style={{ padding:"12px", borderTop:`1px solid ${N.border}`, display:"flex", flexDirection:"column", gap:8 }}>
          <Link href="/billing" style={{
            textDecoration:"none", borderRadius:12, padding:"10px 12px",
            boxShadow: N.inset,
            display:"flex", alignItems:"center", gap:8,
          }}>
            <div style={{ width:28, height:28, borderRadius:8, background: "rgba(22, 163, 74, 0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, boxShadow:N.raisedSm }}>
              ₹
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color: "#16a34a" }}>
                ₹ {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize:10, color:N.muted, marginTop:1, fontWeight:700 }}>
                Wallet Balance
              </div>
            </div>

          </Link>

          <button onClick={handleLogout} disabled={loggingOut} className="neo-btn"
            style={{
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", borderRadius:12,
              fontSize:12, fontWeight:700, background:N.bg, cursor:"pointer", color:"#b91c1c",
              boxShadow: N.raisedSm, border:"none", transition:"all 0.2s",
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* Header */}
        <header style={{
          position:"sticky", top:0, zIndex:30,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 24px", height:58,
          background: N.bg,
          boxShadow:"0 6px 15px rgba(200, 208, 231, 0.4)",
          flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
                background:N.bg, border:"none", cursor:"pointer", padding:8, borderRadius:10,
                color:N.muted, display:"flex", boxShadow:N.raisedSm,
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <h1 style={{ fontSize:15, fontWeight:800, color:N.text, margin:0 }}>{pageTitle}</h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Link href="/reels/new" className="neo-btn" style={{
              display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10,
              fontSize:12, fontWeight:800, textDecoration:"none", color:"#ffffff",
              background: N.accentBg,
              boxShadow: N.raisedSm,
              transition:"all 0.2s",
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Order
            </Link>
            <div style={{
              width:34, height:34, borderRadius:"50%",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13, fontWeight:900, color:"#ffffff",
              background: N.accentBg,
              boxShadow: N.raisedSm,
            }}>{userName}</div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex:1, padding:"28px 28px", overflowY:"auto", maxWidth:1200 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
