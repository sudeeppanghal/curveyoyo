"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CURVE_DESCRIPTIONS_100, STYLE_NEON_COLORS_100 } from "@/lib/delivery/curve-styles-100";
import { N } from "@/lib/theme";



interface Stats {
  totalOrders: number; completedOrders: number; deliveringOrders: number;
  activePanels: number; totalViewsDelivered: number; successRate: number;
  weeklyChart: { date: string; label: string; views: number }[];
  styleBreakdown: { style: string; count: number }[];
  plan: string; trialEndsAt: string | null; lifetimeUnlocked: boolean;
}

function NeoCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised, ...style }}>{children}</div>;
}

function NeoBar({ views, max, label }: { views: number; max: number; label: string }) {
  const pct = max > 0 ? (views / max) * 100 : 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <span style={{ fontSize:11, color:N.muted, width:28, flexShrink:0, fontWeight:700 }}>{label}</span>
      <div style={{ flex:1, height:28, borderRadius:10, position:"relative", background:N.bg, boxShadow:N.inset, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:10, transition:"width 0.7s ease", width:`${pct}%`, background:"linear-gradient(90deg,#d97706,#ea580c)" }} />
        <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:11, color:N.text, fontWeight:800 }}>
          {views > 0 ? views.toLocaleString() : "—"}
        </span>
      </div>
    </div>
  );
}

function ClippingPlatformExplorer() {
  const platforms = [
    "WHOP", "CROSSWAVE", "VYRO", "CLIPPING_NET", "CONTENT_REWARDS",
    "PROMOTE_FUN", "CLIP_AFFILIATES", "OVERLAP_AI", "GENNI"
  ];
  const [selected, setSelected] = useState<string>("WHOP");
  const info = CURVE_DESCRIPTIONS_100[selected] || { label: selected, desc: "", icon: "📊", warmup: 4, peak: 8 };
  const neon = STYLE_NEON_COLORS_100[selected] || { stroke: "#d97706", glow: "rgba(217, 119, 6, 0.4)", stop: "#ea580c" };

  const N_PTS = 26;
  const duration = 24;
  const pts: number[] = [];
  for (let i = 0; i < N_PTS; i++) {
    const x = (i / (N_PTS - 1)) * duration;
    let v = 0;
    if (selected === "WHOP") {
      v = (x > 6 && x < 18) ? 1.0 : (x <= 6 ? (x/6) : ((24-x)/6));
    } else if (selected === "CROSSWAVE") {
      v = 0.5 + 0.4 * Math.sin((x / duration) * 6 * Math.PI);
    } else if (selected === "VYRO") {
      v = Math.pow(x / duration, 0.35);
    } else if (selected === "CLIPPING_NET") {
      v = Math.floor((x / duration) * 5) / 5;
    } else if (selected === "CONTENT_REWARDS") {
      const p = x / duration;
      v = 3 * p * p - 2 * Math.pow(p, 3);
    } else if (selected === "PROMOTE_FUN") {
      v = Math.pow(x / duration, 2.2);
    } else if (selected === "CLIP_AFFILIATES") {
      v = Math.exp(-Math.pow(((x / duration) - 0.7) * 3, 2));
    } else if (selected === "OVERLAP_AI") {
      v = Math.log(1 + (x / duration) * 9) / Math.log(10);
    } else if (selected === "GENNI") {
      const p = x / duration;
      v = p + 0.15 * Math.sin(p * Math.PI * 4);
    }
    pts.push(Math.max(0.05, Math.min(1.0, v)));
  }
  const max = Math.max(...pts, 1);
  const W = 500, H = 140, pad = 16;
  const xs = pts.map((_, i) => pad + (i / (N_PTS - 1)) * (W - 2 * pad));
  const ys = pts.map(p => H - pad - (p / max) * (H - 2 * pad));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = line + ` L ${xs[N_PTS - 1].toFixed(1)} ${H - pad} L ${xs[0].toFixed(1)} ${H - pad} Z`;

  return (
    <NeoCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: N.text, margin: "0 0 4px", letterSpacing: "-0.3px" }}>
            🎯 Clipping Platforms — Customized Pacing Graphs
          </h3>
          <p style={{ fontSize: 12, color: N.muted, margin: 0, fontWeight: 600 }}>
            Specialized algorithm delivery curves tuned to Whop, CrossWave, Vyro, and 6 other monetization platforms
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {platforms.map((pKey) => {
          const item = CURVE_DESCRIPTIONS_100[pKey] || { label: pKey, icon: "📊" };
          const isSel = selected === pKey;
          return (
            <button
              key={pKey}
              onClick={() => setSelected(pKey)}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                border: "none",
                background: isSel ? "linear-gradient(135deg, #2d3748, #1a202c)" : N.bg,
                color: isSel ? "#ffffff" : N.text,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: isSel ? "0 4px 12px rgba(0,0,0,0.25)" : N.raisedSm,
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s"
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: 20, borderRadius: 16, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{info.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: N.text }}>{info.label} Delivery Profile</div>
              <div style={{ fontSize: 11, color: N.muted, fontWeight: 700 }}>Warmup: {info.warmup}h · Peak: {info.peak}h</div>
            </div>
          </div>
          <Link
            href="/reels/new"
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #d97706, #ea580c)",
              color: "#ffffff",
              fontSize: 11,
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: N.raisedSm
            }}
          >
            Use {info.label} Curve →
          </Link>
        </div>

        <p style={{ fontSize: 12, color: N.text, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
          {info.desc}
        </p>

        <div style={{ height: H, position: "relative", marginTop: 8 }}>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id={`grad-${selected}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={neon.stroke} stopOpacity="0.35" />
                <stop offset="100%" stopColor={neon.stroke} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
            <line x1={pad} y1={(H - pad)/2} x2={W - pad} y2={(H - pad)/2} stroke="rgba(0,0,0,0.05)" strokeDasharray="4 4" strokeWidth="1" />
            <path d={area} fill={`url(#grad-${selected})`} />
            <path d={line} fill="none" stroke={neon.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 2px 6px ${neon.glow})` }} />
            <circle cx={xs[N_PTS - 1]} cy={ys[N_PTS - 1]} r="5" fill={neon.stroke} stroke="#ffffff" strokeWidth="2" style={{ filter: `drop-shadow(0 0 4px ${neon.stroke})` }} />
          </svg>
        </div>
      </div>
    </NeoCard>
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
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(217,119,6,0.15)", borderTopColor:N.accent, animation:"spin 0.8s linear infinite", boxShadow:N.raised }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!stats || stats.totalOrders === 0) return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:800 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:0, letterSpacing:"-0.5px" }}>Analytics</h1>
      <NeoCard style={{ padding:"64px 24px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>📊</div>
        <p style={{ fontSize:16, fontWeight:800, color:N.text, margin:0 }}>No data yet</p>
        <p style={{ fontSize:13, color:N.muted, margin:0, fontWeight:600 }}>Place your first order to start seeing analytics</p>
        <Link href="/reels/new" style={{ marginTop:8, padding:"11px 24px", borderRadius:12, fontSize:13, fontWeight:800, textDecoration:"none", color:"#ffffff", background:"linear-gradient(135deg,#d97706,#ea580c)", boxShadow:N.raisedSm }}>
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
          <p style={{ fontSize:13, color:N.muted, margin:0, fontWeight:600 }}>Real-time delivery performance</p>
        </div>
        <div style={{ padding:"7px 14px", borderRadius:20, fontSize:11, fontWeight:700, color:"#16a34a", background:N.bg, boxShadow:N.inset }}>
          ↻ Live — 60s cache
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16, animation:"fadeUp 0.3s ease" }}>
        {[
          { icon:"📦", label:"Total Orders",    val: stats.totalOrders.toLocaleString(),          sub:`${stats.deliveringOrders} active` },
          { icon:"✅", label:"Completed",        val: stats.completedOrders.toLocaleString(),       sub:`${stats.successRate}% success` },
          { icon:"👁", label:"Views Delivered",  val: stats.totalViewsDelivered.toLocaleString(),  sub:"across all campaigns" },
          { icon:"⚡", label:"Active Campaigns", val: stats.deliveringOrders.toLocaleString(),     sub:"delivering now" },
        ].map(({ icon, label, val, sub }, i) => (
          <NeoCard key={label} style={{ animation:`fadeUp ${0.2 + i*0.07}s ease` }}>
            <div style={{ fontSize:24, marginBottom:12, width:42, height:42, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", background:N.bg, boxShadow:N.raisedSm }}>{icon}</div>
            <p style={{ fontSize:26, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-1px" }}>{val}</p>
            <p style={{ fontSize:11, fontWeight:800, color:N.muted, margin:"0 0 2px", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</p>
            <p style={{ fontSize:11, color:N.muted, margin:0, fontWeight:600 }}>{sub}</p>
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
                      <stop offset="0%" stopColor="#d97706" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#d97706" stopOpacity="0"/>
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
                        <path d={line} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#d97706" />)}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize:13, color:N.muted, fontWeight:600 }}>No delivery data in last 7 days</p>
        )}
      </NeoCard>

      {/* Clipping Platform Graphs Card */}
      <ClippingPlatformExplorer />

      {/* Bottom row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:20 }}>
        {/* Curve style breakdown */}
        <NeoCard>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 18px" }}>Delivery Styles Used</h3>
          {stats.styleBreakdown.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {stats.styleBreakdown.map(({ style, count }) => (
                <div key={style} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:20 }}>{CURVE_DESCRIPTIONS_100[style]?.icon ?? "📊"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:13, color:N.text, fontWeight:700 }}>{CURVE_DESCRIPTIONS_100[style]?.label || (style.charAt(0) + style.slice(1).toLowerCase())}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:N.accent }}>{count}</span>
                    </div>
                    <div style={{ height:6, borderRadius:6, overflow:"hidden", background:N.bg, boxShadow:N.inset }}>
                      <div style={{ height:"100%", borderRadius:6, width:`${(count / stats.totalOrders) * 100}%`, background:"linear-gradient(90deg,#d97706,#ea580c)" }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize:13, color:N.muted, fontWeight:600 }}>No orders yet</p>}
        </NeoCard>

        {/* Status summary */}
        <NeoCard>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 18px" }}>Order Status Summary</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[
              { label:"Completed",  count: stats.completedOrders,  color:"#16a34a" },
              { label:"Delivering", count: stats.deliveringOrders, color:"#d97706" },
              { label:"Other",      count: stats.totalOrders - stats.completedOrders - stats.deliveringOrders, color:"#718096" },
            ].filter(r => r.count > 0).map(({ label, count, color }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0, boxShadow:`0 0 6px ${color}` }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:13, color:N.text, fontWeight:700 }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:800, color }}>{count}</span>
                  </div>
                  <div style={{ height:6, borderRadius:6, overflow:"hidden", background:N.bg, boxShadow:N.inset }}>
                    <div style={{ height:"100%", borderRadius:6, width:`${(count / stats.totalOrders) * 100}%`, background:color, transition:"width 0.7s ease" }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:18, paddingTop:18, borderTop:`1px solid ${N.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:N.muted, fontWeight:700 }}>Overall success rate</span>
            <span style={{ fontSize:24, fontWeight:900, color:N.text }}>{stats.successRate}%</span>
          </div>
        </NeoCard>
      </div>

      <Link href="/orders" style={{ fontSize:13, color:N.accent, textDecoration:"none", fontWeight:800, display:"inline-block", width:"fit-content" }} className="neo-btn">View all orders →</Link>
    </div>
  );
}
