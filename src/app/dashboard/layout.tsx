"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { N } from "@/lib/theme";

const NAV = [
  { href: "/dashboard", label: "Overview",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { href: "/reels",    label: "Reels",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
  { href: "/dashboard/shorts-converter", label: "AI Shorts Studio",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg> },
  { href: "/orders",   label: "Orders",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
  { href: "/analytics", label: "Analytics",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { href: "/billing",  label: "Wallet",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { href: "/tickets",  label: "Support",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { href: "/dashboard/auto-orders", label: "AI Automation",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
  { href: "/settings", label: "Settings",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile, setIsMobile]     = useState(false);
  const [userName, setUserName]     = useState("U");
  const [balance, setBalance]       = useState(0.0);

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
    fetch("/api/billing/status")
      .then(r => r.json())
      .then(d => { if (d) setBalance(d.balance ?? 0); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await createClient().auth.signOut();
    router.push("/");
  };

  const pageTitle = NAV.find(n =>
    n.href === pathname || (n.href !== "/dashboard" && pathname.startsWith(n.href))
  )?.label ?? "Dashboard";

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:N.bg, fontFamily:"'Inter',-apple-system,sans-serif", color:N.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:4px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

        /* ── Nav link hover ── */
        .nav-link:hover { box-shadow:4px 4px 12px #c8d0e7,-2px -2px 8px #ffffff !important; color:${N.accent} !important; }
        .neo-btn:hover  { box-shadow:6px 6px 16px #c8d0e7,-3px -3px 10px #ffffff !important; transform:translateY(-1px); }
        .neo-btn:active { box-shadow:inset 3px 3px 8px #c8d0e7,inset -2px -2px 5px #ffffff !important; transform:translateY(0); }
        .neo-qa:hover   { box-shadow:8px 8px 20px #c8d0e7,-4px -4px 12px #ffffff !important; transform:translateY(-2px); }
        .neo-qa:active  { box-shadow:inset 3px 3px 8px #c8d0e7,inset -2px -2px 5px #ffffff !important; transform:none; }
        .neo-step:hover { box-shadow:6px 6px 16px #c8d0e7,-3px -3px 10px #ffffff !important; }
        .neo-input:focus { box-shadow:inset 5px 5px 12px #c8d0e7,inset -3px -3px 8px #ffffff,0 0 0 2px rgba(217,119,6,.25) !important; outline:none; }
        .promo-card-animated { position:relative; overflow:hidden; }
        .promo-card-animated::after { content:''; position:absolute; top:0; left:-150%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.12) 50%,transparent); transform:skewX(-20deg); pointer-events:none; animation:shimmerSweep 5s infinite ease-in-out; }
        @keyframes shimmerSweep { 0%{left:-150%} 30%{left:150%} 100%{left:150%} }
        @keyframes neonGlow { 0%,100%{border-color:rgba(168,85,247,.25);box-shadow:0 12px 36px rgba(0,0,0,.6),0 0 15px rgba(168,85,247,.1)} 50%{border-color:rgba(236,72,153,.55);box-shadow:0 12px 40px rgba(0,0,0,.65),0 0 25px rgba(236,72,153,.25)} }
        @keyframes digitBreathe { 0%,100%{transform:scale(1);border-color:rgba(168,85,247,.35);box-shadow:0 4px 12px rgba(168,85,247,.2)} 50%{transform:scale(1.04);border-color:rgba(168,85,247,.65);box-shadow:0 6px 18px rgba(168,85,247,.45);color:#fff} }
        .promo-card-animated { animation: neonGlow 4s infinite ease-in-out; }
        .digit-box-pulse { animation: digitBreathe 3s infinite ease-in-out; }

        /* ════ MOBILE STYLES ════ */
        .dash-sidebar   { display:flex; }
        .desk-topbar    { display:flex; }
        .mob-topbar     { display:none; }

        @media (max-width:1023px) {
          .dash-sidebar { display:none !important; }
          .desk-topbar  { display:none !important; }
          .mob-topbar   { display:flex !important; }
          .dash-content {
            padding-top: calc(64px + env(safe-area-inset-top, 0px)) !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
            padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>

      {/* ══ DESKTOP SIDEBAR ══ */}
      <aside className="dash-sidebar" style={{
        width:232, minWidth:232, height:"100vh",
        position:"sticky", top:0, left:0, zIndex:50,
        flexDirection:"column",
        background:N.bg,
        boxShadow:"6px 0 20px #c8d0e7",
      }}>
        {/* Logo */}
        <div style={{ padding:"20px 16px 18px", borderBottom:`1px solid ${N.border}` }}>
          <Link href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#d97706,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18, color:"#fff", boxShadow:N.raisedSm }}>Y</div>
            <div>
              <div style={{ fontWeight:850, fontSize:15, color:N.text }}>YoyoSMM</div>
              <div style={{ fontSize:10, color:N.muted, fontWeight:700 }}>Organic Delivery</div>
            </div>
          </Link>
        </div>

        {/* Nav links */}
        <nav style={{ flex:1, overflowY:"auto", padding:"14px 12px", display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ padding:"4px 6px 8px", fontSize:10, fontWeight:800, color:N.faint, textTransform:"uppercase", letterSpacing:"0.1em" }}>Navigation</div>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className="nav-link" style={{
                display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:12,
                fontSize:13, fontWeight:active ? 800 : 600, textDecoration:"none",
                color:active ? N.accent : N.muted,
                boxShadow:active ? N.inset : "none",
                background:N.bg, transition:"all 0.2s",
              }}>
                <span style={{ color:active ? N.accent : N.muted, display:"flex" }}>{icon}</span>
                <span>{label}</span>
                {active && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:N.accent, boxShadow:`0 0 6px ${N.accent}` }} />}
              </Link>
            );
          })}
          <div style={{ height:1, background:N.border, margin:"10px 4px" }} />
          <Link href="/reels/new" className="neo-btn" style={{
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            padding:"11px 12px", borderRadius:12, textDecoration:"none",
            fontSize:13, fontWeight:800, color:"#fff", background:N.accentBg, boxShadow:N.raisedSm,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Order
          </Link>
        </nav>

        {/* Balance + Logout */}
        <div style={{ padding:"12px", borderTop:`1px solid ${N.border}`, display:"flex", flexDirection:"column", gap:8 }}>
          <Link href="/billing" style={{ textDecoration:"none", borderRadius:12, padding:"10px 12px", boxShadow:N.inset, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"rgba(22,163,74,.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, boxShadow:N.raisedSm }}>₹</div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:"#16a34a" }}>₹ {balance.toLocaleString(undefined, { minimumFractionDigits:2 })}</div>
              <div style={{ fontSize:10, color:N.muted, fontWeight:700 }}>Wallet Balance</div>
            </div>
          </Link>
          <button onClick={handleLogout} disabled={loggingOut} className="neo-btn" style={{
            display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", borderRadius:12,
            fontSize:12, fontWeight:700, background:N.bg, cursor:"pointer", color:"#b91c1c",
            boxShadow:N.raisedSm, border:"none",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ══ MAIN COLUMN ══ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* ── Desktop top bar ── */}
        <header className="desk-topbar" style={{
          position:"sticky", top:0, zIndex:30,
          alignItems:"center", justifyContent:"space-between",
          padding:"0 24px", height:58,
          background:N.bg, boxShadow:"0 6px 15px rgba(200,208,231,.4)", flexShrink:0,
        }}>
          <h1 style={{ fontSize:15, fontWeight:800, color:N.text, margin:0 }}>{pageTitle}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Link href="/reels/new" className="neo-btn" style={{
              display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10,
              fontSize:12, fontWeight:800, textDecoration:"none", color:"#fff",
              background:N.accentBg, boxShadow:N.raisedSm,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Order
            </Link>
            <div style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"#fff", background:N.accentBg, boxShadow:N.raisedSm }}>{userName}</div>
          </div>
        </header>

        {/* ── Mobile top app bar ── */}
        <header className="mob-topbar" style={{
          position:"fixed", top:0, left:0, right:0, zIndex:500,
          alignItems:"center", justifyContent:"space-between",
          padding:"0 14px",
          height:"calc(58px + env(safe-area-inset-top, 0px))",
          paddingTop:"env(safe-area-inset-top, 0px)",
          background:N.bg,
          boxShadow:"0 2px 20px rgba(200,208,231,.6), 0 1px 0 rgba(200,208,231,.5)",
          flexShrink:0,
        }}>
          {/* Logo */}
          <Link href="/dashboard" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
            <div style={{ width:36, height:36, borderRadius:11, background:"linear-gradient(135deg,#d97706,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:17, color:"#fff", boxShadow:"4px 4px 10px #c8d0e7,-2px -2px 6px #fff,0 2px 8px rgba(217,119,6,.25)" }}>Y</div>
            <div>
              <div style={{ fontSize:15, fontWeight:900, color:N.text, letterSpacing:"-0.4px", lineHeight:1.1 }}>YoyoSMM</div>
              <div style={{ fontSize:9, color:N.muted, fontWeight:700, letterSpacing:"0.04em" }}>ORGANIC DELIVERY</div>
            </div>
          </Link>

          {/* Right: balance pill + avatar */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Link href="/billing" style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"6px 12px", borderRadius:20,
              background:N.bg, boxShadow:N.inset, textDecoration:"none",
            }}>
              <span style={{ fontSize:11, color:N.muted, fontWeight:700 }}>₹</span>
              <span style={{ fontSize:14, fontWeight:900, color:"#16a34a" }}>
                {balance >= 1000 ? `${(balance/1000).toFixed(1)}k` : balance.toLocaleString(undefined, { minimumFractionDigits:0 })}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                width:38, height:38, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:15, fontWeight:900, color:"#fff",
                background:"linear-gradient(135deg,#d97706,#ea580c)",
                boxShadow:N.raisedSm, border:"none", cursor:"pointer",
                WebkitTapHighlightColor:"transparent",
              }}
            >{userName}</button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="dash-content" style={{ flex:1, padding:"28px", overflowY:"auto", maxWidth:1440, width:"100%" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
