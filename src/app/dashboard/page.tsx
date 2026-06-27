"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  text:     "#2d3748",
  muted:    "#718096",
  border:   "rgba(200, 208, 231, 0.4)",
};

interface Stats {
  totalOrders?: number; activeOrders?: number;
  viewsDelivered?: number; panelsOnline?: number;
  totalReels?: number; completedOrders?: number;
}

function NeoCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised, ...style }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label:string; value:string|number; sub:string; icon:string }) {
  return (
    <NeoCard>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ width:44, height:44, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, background:N.bg, boxShadow:N.raisedSm }}>
          {icon}
        </div>
        <div style={{ fontSize:10, fontWeight:800, color:"#16a34a", background:"rgba(22,163,74,0.1)", padding:"3px 8px", borderRadius:6, boxShadow:N.inset }}>LIVE</div>
      </div>
      <div style={{ fontSize:28, fontWeight:900, color:N.text, letterSpacing:"-1px", marginBottom:4 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize:12, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:11, color:N.muted, fontWeight:600 }}>{sub}</div>
    </NeoCard>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics").then(r => r.json()).then(d => { setStats(d.stats ?? d ?? {}); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const quickActions = [
    { label:"Add New Reel",    href:"/reels/new",    icon:"🎬", desc:"Import a reel URL to track" },
    { label:"Create Order",    href:"/reels/new",    icon:"⚡", desc:"Start organic S-curve delivery" },
    { label:"Add SMM Panel",   href:"/panels",       icon:"🔌", desc:"Connect your provider API" },
    { label:"View Analytics",  href:"/analytics",    icon:"📊", desc:"Track views & engagement" },
  ];

  const steps = [
    { num:"01", label:"Add a Panel",     desc:"Connect your SMM provider via API",        href:"/panels",    done: (stats.panelsOnline ?? 0) > 0 },
    { num:"02", label:"Import a Reel",   desc:"Paste any Instagram or TikTok reel URL",   href:"/reels/new", done: (stats.totalReels ?? 0) > 0 },
    { num:"03", label:"Create an Order", desc:"Set views, curve shape, and run campaign", href:"/reels/new", done: (stats.totalOrders ?? 0) > 0 },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .neo-qa:hover{box-shadow:10px 10px 24px #c8d0e7,-5px -5px 14px #ffffff !important;transform:translateY(-2px)}
        .neo-qa:active{box-shadow:inset 4px 4px 10px #c8d0e7,inset -2px -2px 6px #ffffff !important;transform:none}
        .neo-step:hover{box-shadow:6px 6px 16px #c8d0e7,-3px -3px 10px #ffffff !important}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-0.5px" }}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"} 👋
          </h1>
          <p style={{ fontSize:13, color:N.muted, margin:0, fontWeight:600 }}>Your organic delivery dashboard</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {(stats.activeOrders ?? 0) > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:20, background:N.bg, boxShadow:N.inset }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:N.accent, animation:"pulse 1.5s infinite", display:"inline-block" }}/>
              <span style={{ fontSize:12, fontWeight:800, color:N.accent }}>{stats.activeOrders} delivering</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16 }}>
          {[...Array(4)].map((_,i) => (
            <div key={i} style={{ borderRadius:20, height:130, background:N.bg, boxShadow:N.inset, animation:"pulse 2s infinite" }} />
          ))}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16 }}>
          <StatCard label="Total Orders"    value={stats.totalOrders ?? 0}     sub="All time campaigns"           icon="📋" />
          <StatCard label="Live Now"        value={stats.activeOrders ?? 0}    sub="Currently delivering"         icon="⚡" />
          <StatCard label="Views Sent"      value={stats.viewsDelivered ?? 0}  sub="Total organic views"          icon="👁" />
          <StatCard label="Panels Online"   value={stats.panelsOnline ?? 0}    sub="Active SMM providers"         icon="🔌" />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p style={{ fontSize:11, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 14px" }}>Quick Actions</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
          {quickActions.map((a, i) => (
            <Link key={i} href={a.href} className="neo-qa"
              style={{
                textDecoration:"none", borderRadius:18, padding:"20px 18px",
                background:N.bg, boxShadow:N.raised,
                display:"flex", flexDirection:"column", gap:10,
                cursor:"pointer", transition:"all 0.2s",
              }}>
              <div style={{ width:42, height:42, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, background:N.bg, boxShadow:N.raisedSm }}>
                {a.icon}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:N.text, marginBottom:3 }}>{a.label}</div>
                <div style={{ fontSize:11, color:N.muted, fontWeight:600 }}>{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Get Started Steps */}
      <div>
        <p style={{ fontSize:11, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 14px" }}>Get Started</p>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {steps.map((s, i) => (
            <Link key={i} href={s.href} className="neo-step"
              style={{
                textDecoration:"none", borderRadius:16, padding:"16px 20px",
                background:N.bg,
                boxShadow: s.done ? N.inset : N.raised,
                display:"flex", alignItems:"center", gap:16, transition:"all 0.2s",
              }}>
              <div style={{ width:40, height:40, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:N.bg, boxShadow: s.done ? N.inset : N.raisedSm }}>
                {s.done
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span style={{ fontSize:11, fontWeight:900, color:N.accent, fontVariantNumeric:"tabular-nums" }}>{s.num}</span>
                }
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:800, color: s.done ? "#16a34a" : N.text, marginBottom:2 }}>{s.label}</div>
                <div style={{ fontSize:12, color:N.muted, fontWeight:600 }}>{s.desc}</div>
              </div>
              {!s.done && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={N.muted} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
