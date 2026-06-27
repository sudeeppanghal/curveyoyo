"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const N = {
  bg:       "#111118",
  raised:   "8px 8px 20px rgba(0,0,0,0.65), -4px -4px 12px rgba(255,255,255,0.05)",
  raisedSm: "4px 4px 12px rgba(0,0,0,0.6), -2px -2px 8px rgba(255,255,255,0.04)",
  inset:    "inset 4px 4px 10px rgba(0,0,0,0.6), inset -2px -2px 6px rgba(255,255,255,0.04)",
  accent:   "#F59E0B",
  text:     "#e2e8f0",
  muted:    "#4a5568",
};

interface Stats {
  totalOrders: number; completedOrders: number; deliveringOrders: number;
  activePanels: number; totalViewsDelivered: number; successRate: number;
  weeklyChart: { date: string; label: string; views: number }[];
  styleBreakdown: { style: string; count: number }[];
  plan: string; trialEndsAt: string | null; lifetimeUnlocked: boolean;
}

const STYLE_ICONS: Record<string, string> = { ORGANIC: "🌅", FAST: "⚡", AGGRESSIVE: "🔥" };

function NeoCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised, ...style }}>{children}</div>;
}

function NeoBar({ views, max, label }: { views: number; max: number; label: string }) {
  const pct = max > 0 ? (views / max) * 100 : 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <span style={{ fontSize:11, color:N.muted, width:28, flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:28, borderRadius:10, position:"relative", background:N.bg, boxShadow:N.inset, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:10, transition:"width 0.7s ease", width:`${pct}%`, background:"linear-gradient(90deg,#F59E0B,#F97316)" }} />
        <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:11, color:N.text, fontWeight:700 }}>
          {views > 0 ? views.toLocaleString() : "—"}
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => {
        setStats({
          totalOrders:         d.totalOrders         ?? 0,
          completedOrders:     d.completedOrders     ?? 0,
          deliveringOrders:    d.deliveringOrders    ?? 0,
          activePanels:        d.activePanels        ?? 0,
          totalViewsDelivered: d.totalViewsDelivered ?? 0,
          successRate:         d.successRate         ?? 0,
          weeklyChart:         d.weeklyChart         ?? [],
          styleBreakdown:      d.styleBreakdown      ?? [],
          plan:                d.plan                ?? "FREE",
          trialEndsAt:         d.trialEndsAt         ?? null,
          lifetimeUnlocked:    d.lifetimeUnlocked    ?? false,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:240 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(245,158,11,0.15)", borderTopColor:N.accent, animation:"spin 0.8s linear infinite", boxShadow:N.raised }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!stats || stats.totalOrders === 0) return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:800 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:0, letterSpacing:"-0.5px" }}>Analytics</h1>
      <NeoCard style={{ padding:"64px 24px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>📊</div>
        <p style={{ fontSize:16, fontWeight:800, color:N.text, margin:0 }}>No data yet</p>
        <p style={{ fontSize:13, color:N.muted, margin:0 }}>Place your first order to start seeing analytics</p>
        <Link href="/reels/new" style={{ marginTop:8, padding:"11px 24px", borderRadius:12, fontSize:13, fontWeight:800, textDecoration:"none", color:"#08080c", background:"linear-gradient(135deg,#F59E0B,#F97316)", boxShadow:N.raisedSm }}>
          Create First Order →
        </Link>
      </NeoCard>
    </div>
  );

  const chartPts = stats.weeklyChart ?? [];
  const maxViews = Math.max(...chartPts.map(d => d.views), 1);
  const W = 500, H = 100, pad = 12;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:900 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-0.5px" }}>Analytics</h1>
          <p style={{ fontSize:13, color:N.muted, margin:0 }}>Real-time delivery performance</p>
        </div>
        <div style={{ padding:"7px 14px", borderRadius:20, fontSize:11, fontWeight:700, color:"#34d399", background:N.bg, boxShadow:N.inset }}>
          ↻ Live — 60s cache
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16, animation:"fadeUp 0.3s ease" }}>
        {[
          { icon:"📦", label:"Total Orders",    val: stats.totalOrders.toLocaleString(),          sub:`${stats.deliveringOrders} active` },
          { icon:"✅", label:"Completed",        val: stats.completedOrders.toLocaleString(),       sub:`${stats.successRate}% success` },
          { icon:"👁", label:"Views Delivered",  val: stats.totalViewsDelivered.toLocaleString(),  sub:"across all campaigns" },
          { icon:"🔌", label:"Active Panels",    val: stats.activePanels.toLocaleString(),          sub:"connected providers" },
        ].map(({ icon, label, val, sub }, i) => (
          <NeoCard key={label} style={{ animation:`fadeUp ${0.2 + i*0.07}s ease` }}>
            <div style={{ fontSize:24, marginBottom:12, width:42, height:42, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", background:N.bg, boxShadow:N.raisedSm }}>{icon}</div>
            <p style={{ fontSize:26, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-1px" }}>{val}</p>
            <p style={{ fontSize:11, fontWeight:700, color:N.muted, margin:"0 0 2px", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</p>
            <p style={{ fontSize:11, color:"#2d3748", margin:0 }}>{sub}</p>
          </NeoCard>
        ))}
      </div>

      {/* 7-day chart */}
      <NeoCard>
        <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 20px" }}>📈 Views Delivered — Last 7 Days</h3>
        {chartPts.length > 0 ? (
          <>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {chartPts.map(d => <NeoBar key={d.date} views={d.views} max={maxViews} label={d.label} />)}
            </div>
            {chartPts.some(d => d.views > 0) && (
              <div style={{ marginTop:24, borderRadius:14, overflow:"hidden", boxShadow:N.inset, padding:12 }}>
                <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {(() => {
                    const pts = chartPts.map((d, i) => ({
                      x: pad + (i / (chartPts.length - 1)) * (W - 2 * pad),
                      y: H - pad - ((d.views / maxViews) * (H - 2 * pad)),
                    }));
                    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
                    const fill = [line, `L ${pts.at(-1)!.x.toFixed(1)} ${H - pad}`, `L ${pts[0].x.toFixed(1)} ${H - pad} Z`].join(" ");
                    return (
                      <>
                        <path d={fill} fill="url(#aGrad)"/>
                        <path d={line} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#F59E0B" style={{ filter:"drop-shadow(0 0 4px #F59E0B)" }}/>)}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize:13, color:N.muted }}>No delivery data in last 7 days</p>
        )}
      </NeoCard>

      {/* Bottom row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Curve style breakdown */}
        <NeoCard>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 18px" }}>Delivery Styles Used</h3>
          {stats.styleBreakdown.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {stats.styleBreakdown.map(({ style, count }) => (
                <div key={style} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:20 }}>{STYLE_ICONS[style] ?? "📊"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:13, color:N.text }}>{style.charAt(0) + style.slice(1).toLowerCase()}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:N.accent }}>{count}</span>
                    </div>
                    <div style={{ height:6, borderRadius:6, overflow:"hidden", background:N.bg, boxShadow:N.inset }}>
                      <div style={{ height:"100%", borderRadius:6, width:`${(count / stats.totalOrders) * 100}%`, background:"linear-gradient(90deg,#F59E0B,#F97316)" }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize:13, color:N.muted }}>No orders yet</p>}
        </NeoCard>

        {/* Status summary */}
        <NeoCard>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 18px" }}>Order Status Summary</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[
              { label:"Completed",  count: stats.completedOrders,  color:"#34d399" },
              { label:"Delivering", count: stats.deliveringOrders, color:"#F59E0B" },
              { label:"Other",      count: stats.totalOrders - stats.completedOrders - stats.deliveringOrders, color:"#6b7280" },
            ].filter(r => r.count > 0).map(({ label, count, color }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0, boxShadow:`0 0 8px ${color}` }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:13, color:N.text }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color }}>{count}</span>
                  </div>
                  <div style={{ height:6, borderRadius:6, overflow:"hidden", background:N.bg, boxShadow:N.inset }}>
                    <div style={{ height:"100%", borderRadius:6, width:`${(count / stats.totalOrders) * 100}%`, background:color, transition:"width 0.7s ease" }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:18, paddingTop:18, borderTop:"1px solid rgba(255,255,255,0.04)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:N.muted }}>Overall success rate</span>
            <span style={{ fontSize:24, fontWeight:900, color:N.text }}>{stats.successRate}%</span>
          </div>
        </NeoCard>
      </div>

      <Link href="/orders" style={{ fontSize:13, color:N.accent, textDecoration:"none", fontWeight:700 }}>View all orders →</Link>
    </div>
  );
}
