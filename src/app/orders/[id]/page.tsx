"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

/* ── Types ── */
interface ChartPoint { hour: number; planned: number; actual: number; status: string; scheduledAt?: string; responseData?: any }
interface OrderStatus {
  order: {
    id: string; status: string; viewsTarget: number; viewsDelivered: number;
    viewsRemaining: number; progressPct: number; curveStyle: string;
    durationHours: number; startedAt: string | null; completedAt: string | null;
    reel: { url: string; platform: string };
    panel: { name: string; status: string } | null;
    // Engagement
    engagementEnabled: boolean;
    likesTarget: number; likesDelivered: number;
    savesTarget: number; savesDelivered: number;
    sharesTarget: number; sharesDelivered: number;
    commentsTarget: number; commentsDelivered: number;
  };
  chartData: ChartPoint[];
  totalBatches: number; completedBatches: number; failedBatches: number;
}

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  accentBg: "linear-gradient(135deg, #d97706, #ea580c)",
  text:     "#2d3748",
  muted:    "#718096",
  border:   "rgba(200, 208, 231, 0.4)",
};

/* ── Status badge ── */
const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  PENDING:    { bg:"rgba(113,128,150,0.1)", color:"#718096", dot:"#718096",  label:"Pending" },
  QUEUED:     { bg:"rgba(37,99,235,0.1)",   color:"#2563eb", dot:"#2563eb",  label:"Queued" },
  DELIVERING: { bg:"rgba(217,119,6,0.1)",   color:"#d97706", dot:"#d97706",  label:"Delivering" },
  COMPLETED:  { bg:"rgba(22,163,74,0.1)",   color:"#16a34a", dot:"#16a34a",  label:"Completed" },
  FAILED:     { bg:"rgba(220,38,38,0.1)",   color:"#dc2626", dot:"#dc2626",  label:"Failed" },
  CANCELLED:  { bg:"rgba(113,128,150,0.1)", color:"#718096", dot:"#718096",  label:"Cancelled" },
  PAUSED:     { bg:"rgba(217,119,6,0.1)",   color:"#d97706", dot:"#d97706",  label:"Paused" },
};

/* ── Dual-layer delivery chart ── */
function DeliveryChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) return null;

  // Calculate cumulative planned and actual views
  let runningPlanned = 0;
  let runningActual = 0;
  const cumulativeData = data.map((d) => {
    runningPlanned += d.planned;
    runningActual += d.status === "DONE" ? d.planned : 0;
    return {
      ...d,
      cumulativePlanned: runningPlanned,
      cumulativeActual: runningActual,
    };
  });

  const W = 600, H = 180, pad = 30;
  const maxVal = Math.max(cumulativeData.at(-1)!.cumulativePlanned, 1);

  const toX = (i: number) => pad + (i / Math.max(cumulativeData.length - 1, 1)) * (W - 2 * pad);
  const toY = (v: number) => H - pad - (v / maxVal) * (H - 2 * pad);

  const plannedPts = cumulativeData.map((d, i) => ({ x: toX(i), y: toY(d.cumulativePlanned) }));
  
  // Find the last executed batch index so actual line doesn't extend into future scheduled batches
  const lastExecutedIdx = data.findLastIndex((d) => d.status === "DONE" || d.status === "FAILED");
  const actualPts = cumulativeData
    .slice(0, lastExecutedIdx !== -1 ? lastExecutedIdx + 1 : 0)
    .map((d, i) => ({ x: toX(i), y: toY(d.cumulativeActual) }));

  const makePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const makeFill = (pts: { x: number; y: number }[]) => {
    if (!pts.length) return "";
    return [
      makePath(pts),
      `L ${pts.at(-1)!.x.toFixed(1)} ${(H - pad).toFixed(1)}`,
      `L ${pts[0].x.toFixed(1)} ${(H - pad).toFixed(1)} Z`,
    ].join(" ");
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:12, fontSize:11 }}>
        <span style={{ display:"flex", alignItems:"center", gap:6, color:N.muted, fontWeight:700 }}><span style={{ width:12, height:3, borderRadius:4, display:"inline-block", background:"rgba(217,119,6,0.5)" }} /> Planned Growth</span>
        <span style={{ display:"flex", alignItems:"center", gap:6, color:N.muted, fontWeight:700 }}><span style={{ width:12, height:3, borderRadius:4, display:"inline-block", background:"#16a34a" }} /> Actual Growth</span>
        <span style={{ color:N.muted, marginLeft:"auto", fontWeight:600 }}>{data.length} batches</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ borderRadius:12, background: "#120324", padding: "16px 0", overflow: "visible" }}>
        <defs>
          <linearGradient id="planGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines (Y-axis percentages) */}
        {[0, 0.25, 0.5, 0.75, 1].map((val) => {
          const y = H - pad - val * (H - 2 * pad);
          return (
            <line key={val} x1={pad} y1={y} x2={W - pad} y2={y} stroke="#230e3d" strokeWidth="1" strokeDasharray="3 3" />
          );
        })}
        {/* Planned fill + line */}
        {plannedPts.length > 0 && (
          <g>
            <path d={makeFill(plannedPts)} fill="url(#planGrad)" />
            <path d={makePath(plannedPts)} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
          </g>
        )}
        {/* Actual fill + line */}
        {actualPts.length > 0 && (
          <g>
            <path d={makeFill(actualPts)} fill="url(#actGrad)" />
            <path d={makePath(actualPts)} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
        {/* Hour x-labels */}
        {[0, Math.floor(data.length/4), Math.floor(data.length/2), Math.floor(3*data.length/4), data.length-1]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((i) => (
          <text key={i} x={toX(i)} y={H - 8} fill="#a78bfa" fontSize="9" textAnchor="middle" fontWeight="700">
            {data[i]?.scheduledAt 
              ? new Date(data[i].scheduledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) 
              : `Hour ${data[i]?.hour ?? i}h`}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ── Progress ring ── */
function ProgressRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={N.border} strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#d97706" strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x={size/2} y={size/2+2} fill={N.text} fontSize="18" fontWeight="900" textAnchor="middle"
        dominantBaseline="middle" style={{ transform: `rotate(90deg, ${size/2}px, ${size/2}px)` }}>{pct}%</text>
    </svg>
  );
}

/* ── Main page ── */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/delivery/status/${id}`);
      if (!res.ok) { setError("Order not found"); return; }
      const json = await res.json();
      setData(json);
    } catch { setError("Failed to load order"); }
    finally { setLoading(false); }
  }, [id]);

  // Initial load + auto-refresh every 15s for live orders
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      setData((prev) => {
        if (prev?.order.status === "DELIVERING" || prev?.order.status === "QUEUED") {
          fetchStatus();
        }
        return prev;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleAction = async (action: "pause" | "cancel") => {
    if (!confirm(`${action === "cancel" ? "Cancel" : "Pause"} this order?`)) return;
    setActioning(true);
    try {
      await fetch(`/api/delivery/status/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      fetchStatus();
    } finally { setActioning(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:240 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(217,119,6,0.15)", borderTopColor:N.accent, animation:"spin 0.8s linear infinite", boxShadow:N.raised }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !data) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:240, gap:16, textAlign:"center" }}>
      <p style={{ color:"#dc2626", fontWeight:700 }}>⚠️ {error || "Order not found"}</p>
      <Link href="/orders" style={{ color:N.accent, textDecoration:"none", fontWeight:800 }} className="neo-btn">← Back to orders</Link>
    </div>
  );

  const { order, chartData, totalBatches, completedBatches, failedBatches } = data;
  const st = STATUS_STYLES[order.status] ?? STATUS_STYLES.PENDING;
  const isLive = order.status === "DELIVERING" || order.status === "QUEUED";
  const platformIcons: Record<string, string> = { INSTAGRAM:"📷", TIKTOK:"🎵", YOUTUBE:"▶️" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:800 }}>
      <style>{`
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <Link href="/orders" style={{ fontSize:20, color:N.muted, textDecoration:"none", fontWeight:800 }} className="neo-btn">←</Link>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
              <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:0, letterSpacing:"-0.5px" }}>Order Detail</h1>
              <span style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:6, background: st.bg, color: st.color }}>
                <span style={{ width:6, height:6, borderRadius:"50%", display:"inline-block", background: st.dot }} />
                {st.label}
                {isLive && <span style={{ width:6, height:6, borderRadius:"50%", background:"#d97706", animation:"pulse 1.5s infinite" }} />}
              </span>
            </div>
            <p style={{ fontSize:12, color:N.muted, fontWeight:600, margin:0 }}>{platformIcons[order.reel.platform] ?? "🎬"} {order.reel.url.slice(0, 60)}{order.reel.url.length > 60 ? "…" : ""}</p>
          </div>
        </div>
        {/* Actions */}
        {(order.status === "DELIVERING" || order.status === "QUEUED") && (
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <button onClick={() => handleAction("pause")} disabled={actioning} className="neo-btn"
              style={{ padding:"8px 14px", borderRadius:10, fontSize:11, fontWeight:800, border:"none", cursor:"pointer", background:N.bg, color:N.accent, boxShadow:N.raisedSm }}>⏸ Pause</button>
            <button onClick={() => handleAction("cancel")} disabled={actioning} className="neo-btn"
              style={{ padding:"8px 14px", borderRadius:10, fontSize:11, fontWeight:800, border:"none", cursor:"pointer", background:N.bg, color:"#dc2626", boxShadow:N.raisedSm }}>✕ Cancel</button>
          </div>
        )}
      </div>

      {/* ── Top stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:16 }}>
        {[
          ["🎯", "Target", order.viewsTarget.toLocaleString(), "views"],
          ["✅", "Delivered", order.viewsDelivered.toLocaleString(), "views"],
          ["⏳", "Remaining", order.viewsRemaining.toLocaleString(), "views"],
          ["🔌", "Panel", order.panel?.name ?? "None", order.panel?.status ?? ""],
        ].map(([icon, label, val, sub]) => (
          <div key={label} style={{ borderRadius:16, padding:18, background:N.bg, boxShadow:N.raised }}>
            <div style={{ fontSize:20, marginBottom:8 }}>{icon}</div>
            <p style={{ fontSize:18, fontWeight:900, color:N.text, margin:0 }}>{val}</p>
            <p style={{ fontSize:11, color:N.muted, fontWeight:700, margin:0 }}>{label}</p>
            {sub && <p style={{ fontSize:11, color:N.muted, margin:"2px 0 0", fontWeight:600 }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Engagement Metrics ── */}
      {order.engagementEnabled && (order.likesTarget > 0 || order.savesTarget > 0 || order.sharesTarget > 0 || order.commentsTarget > 0) && (
        <div style={{ borderRadius:24, padding:24, background:N.bg, boxShadow:N.raised }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <span style={{ fontSize:13, fontWeight:800, color:N.text }}>Engagement Delivery</span>
            <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700, color:"#16a34a", background:"rgba(22,163,74,0.1)" }}>Paced with S-curve</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16 }}>
            {[
              { icon: "👍", label: "Likes",    delivered: order.likesDelivered,    target: order.likesTarget },
              { icon: "🔖", label: "Saves",    delivered: order.savesDelivered,    target: order.savesTarget },
              { icon: "📤", label: "Shares",   delivered: order.sharesDelivered,   target: order.sharesTarget },
              { icon: "💬", label: "Comments", delivered: order.commentsDelivered, target: order.commentsTarget },
            ].filter((e) => e.target > 0).map(({ icon, label, delivered, target }) => {
              const pct = target > 0 ? Math.min(100, Math.round((delivered / target) * 100)) : 0;
              return (
                <div key={label} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                    <span style={{ color:N.muted, fontWeight:700 }}>{icon} {label}</span>
                    <span style={{ fontWeight:850, color:N.text }}>{delivered.toLocaleString()} <span style={{ color:N.muted, fontWeight:600 }}>/ {target.toLocaleString()}</span></span>
                  </div>
                  <div style={{ width:"100%", height:8, borderRadius:6, overflow:"hidden", background:N.bg, boxShadow:N.inset }}>
                    <div style={{ height:"100%", borderRadius:6, transition:"width 0.7s ease", width: `${pct}%`, background: "linear-gradient(90deg, #16a34a, #22c55e)" }} />
                  </div>
                  <p style={{ fontSize:11, color:"#16a34a", fontWeight:800, margin:0 }}>{pct}% complete</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Card */}
      <div style={{ borderRadius:24, padding:24, background:N.bg, boxShadow:N.raised, display:"flex", flexWrap:"wrap", alignItems:"center", gap:24 }}>
        <div style={{ display:"flex", justifyContent:"center", flexShrink:0 }}>
          <ProgressRing pct={order.progressPct} />
        </div>
        <div style={{ flex:1, minWidth:220 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <p style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>Delivery Progress</p>
            <p style={{ fontSize:14, fontWeight:900, color:N.accent, margin:0 }}>{order.progressPct}%</p>
          </div>
          <div style={{ width:"100%", borderRadius:10, height:10, overflow:"hidden", background:N.bg, boxShadow:N.inset }}>
            <div style={{ height:"100%", borderRadius:10, transition:"width 0.7s ease", width:`${order.progressPct}%`, background:"linear-gradient(90deg, #d97706, #ea580c)" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontSize:11, color:N.muted, fontWeight:700 }}>
            <span>Batches: {completedBatches}/{totalBatches} done</span>
            {failedBatches > 0 && <span style={{ color:"#dc2626" }}>{failedBatches} failed</span>}
            <span>Style: {order.curveStyle}</span>
            <span>{order.durationHours}h campaign</span>
          </div>
          {isLive && (
            <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:6, fontSize:11, color:N.accent, fontWeight:700 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#d97706", animation:"pulse 1.5s infinite" }} />
              Live — auto-refreshes every 15s
            </div>
          )}
        </div>
      </div>

      {/* ── Live delivery chart ── */}
      <div style={{ borderRadius:24, padding:24, background:N.bg, boxShadow:N.raised }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>📈 Delivery Chart — Planned vs Actual</h3>
          <button onClick={fetchStatus} style={{ border:"none", background:"none", fontSize:12, color:N.accent, fontWeight:800, cursor:"pointer" }} className="neo-btn">↻ Refresh</button>
        </div>
        {chartData.length > 0 ? (
          <DeliveryChart data={chartData} />
        ) : (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:120, color:N.muted, fontSize:13, fontWeight:600 }}>
            No delivery data yet — delivery starts shortly
          </div>
        )}
      </div>

      {/* ── Batch event table ── */}
      <div style={{ borderRadius:24, overflow:"hidden", background:N.bg, boxShadow:N.raised }}>
        <div style={{ padding:20, borderBottom:`1px solid ${N.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>Delivery Batches Timeline</h3>
            <p style={{ fontSize:11, color:N.muted, margin:"2px 0 0", fontWeight:600 }}>Detailed list of all scheduled events and engagement targets</p>
          </div>
          <span style={{ padding:"4px 10px", borderRadius:12, fontSize:11, fontWeight:750, color:N.accent, background:"rgba(217,119,6,0.1)", boxShadow:N.raisedSm }}>
            Total: {chartData.length} Batches
          </span>
        </div>
        <div style={{ overflowY:"auto", maxHeight: 400 }}>
          <table style={{ width:"100%", textAlign:"left", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ color:N.muted, borderBottom:`1px solid ${N.border}`, fontWeight:850, background:"rgba(200, 208, 231, 0.1)" }}>
                <th style={{ padding:"12px 16px" }}>Batch</th>
                <th style={{ padding:"12px 16px" }}>Scheduled Time</th>
                <th style={{ padding:"12px 16px", textAlign:"right" }}>Views</th>
                {order.engagementEnabled && (
                  <>
                    <th style={{ padding:"12px 16px", textAlign:"right" }}>Likes</th>
                    <th style={{ padding:"12px 16px", textAlign:"right" }}>Saves</th>
                    <th style={{ padding:"12px 16px", textAlign:"right" }}>Shares</th>
                    <th style={{ padding:"12px 16px", textAlign:"right" }}>Comments</th>
                  </>
                )}
                <th style={{ padding:"12px 16px", textAlign:"center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => {
                const evStyle: Record<string, string> = {
                  DONE:"#16a34a", FAILED:"#dc2626", EXECUTING:"#d97706",
                  SCHEDULED:"#718096", RETRYING:"#2563eb",
                };
                
                const timeText = i === 0 && !row.scheduledAt
                  ? "⚡ Instant" 
                  : row.scheduledAt
                    ? new Date(row.scheduledAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true
                      })
                    : `+${row.hour}h`;

                // Calculate engagement values for this batch based on views proportion
                let bLikes = 0;
                let bSaves = 0;
                let bShares = 0;
                let bComments = 0;

                const resData = row.responseData as any;
                const isCustomOrder = !!(resData && (resData.customEngagement || resData.engagementFired));
                
                if (resData && resData.engagementFired) {
                  bLikes = resData.engagementFired.likes ?? 0;
                  bSaves = resData.engagementFired.saves ?? 0;
                  bShares = resData.engagementFired.shares ?? 0;
                  bComments = resData.engagementFired.comments ?? 0;
                } else if (resData && resData.customEngagement) {
                  bLikes = resData.customEngagement.likes ?? 0;
                  bSaves = resData.customEngagement.saves ?? 0;
                  bShares = resData.customEngagement.shares ?? 0;
                  bComments = resData.customEngagement.comments ?? 0;
                } else if (!isCustomOrder) {
                  // Fallback for scheduled standard orders (not fired yet)
                  const scale = order.viewsTarget > 0 ? row.planned / order.viewsTarget : 0;
                  bLikes = order.likesTarget > 0 ? Math.round(order.likesTarget * scale) : 0;
                  bSaves = order.savesTarget > 0 ? Math.round(order.savesTarget * scale) : 0;
                  bShares = order.sharesTarget > 0 ? Math.round(order.sharesTarget * scale) : 0;
                  bComments = order.commentsTarget > 0 ? Math.round(order.commentsTarget * scale) : 0;
                }

                return (
                  <tr key={i} style={{ borderBottom:`1px solid ${N.border}`, transition:"background 0.2s" }}>
                    <td style={{ padding:"12px 16px", color:N.muted, fontWeight:700 }}>#{i + 1}</td>
                    <td style={{ padding:"12px 16px", color:"#d97706", fontWeight:800 }}>{timeText}</td>
                    <td style={{ padding:"12px 16px", textAlign:"right", fontWeight:800, color:N.text }}>
                      {row.planned.toLocaleString()}
                    </td>
                    {order.engagementEnabled && (
                      <>
                        <td style={{ padding:"12px 16px", textAlign:"right", color: bLikes > 0 ? "#16a34a" : N.muted, fontWeight: bLikes > 0 ? 800 : 500 }}>
                          {bLikes > 0 ? bLikes.toLocaleString() : "—"}
                        </td>
                        <td style={{ padding:"12px 16px", textAlign:"right", color: bSaves > 0 ? "#16a34a" : N.muted, fontWeight: bSaves > 0 ? 800 : 500 }}>
                          {bSaves > 0 ? bSaves.toLocaleString() : "—"}
                        </td>
                        <td style={{ padding:"12px 16px", textAlign:"right", color: bShares > 0 ? "#16a34a" : N.muted, fontWeight: bShares > 0 ? 800 : 500 }}>
                          {bShares > 0 ? bShares.toLocaleString() : "—"}
                        </td>
                        <td style={{ padding:"12px 16px", textAlign:"right", color: bComments > 0 ? "#16a34a" : N.muted, fontWeight: bComments > 0 ? 800 : 500 }}>
                          {bComments > 0 ? bComments.toLocaleString() : "—"}
                        </td>
                      </>
                    )}
                    <td style={{ padding:"12px 16px", textAlign:"center" }}>
                      <span style={{ fontSize:11, fontWeight:850, letterSpacing:"0.03em", color: evStyle[row.status] ?? "#718096" }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!chartData.some(row => row.responseData?.customEngagement) && order.engagementEnabled && (
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${N.border}`, background: "rgba(200, 208, 231, 0.05)", fontSize: 11, color: N.muted, fontWeight: 600 }}>
            * Note: For standard pacing campaigns, small engagements (e.g. less than 10) are accumulated and fired in organic-timed bursts once they reach the minimum panel limit.
          </div>
        )}
      </div>

      {/* ── Order info ── */}
      <div style={{ borderRadius:24, padding:24, background:N.bg, boxShadow:N.raised }}>
        <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 16px" }}>Order Info</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:"10px 24px", fontSize:13 }}>
          {[
            ["Order ID", order.id],
            ["Platform", `${platformIcons[order.reel.platform] ?? "🎬"} ${order.reel.platform}`],
            ["Curve Style", order.curveStyle],
            ["Duration", `${order.durationHours} hours`],
            ["Started", order.startedAt ? new Date(order.startedAt).toLocaleString() : "Pending"],
            ["Completed", order.completedAt ? new Date(order.completedAt).toLocaleString() : "—"],
          ].map(([label, value]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", paddingTop:8, paddingBottom:8, borderBottom:`1px solid ${N.border}` }}>
              <span style={{ color:N.muted, fontWeight:600 }}>{label}</span>
              <span style={{ color:N.text, fontWeight:800, textAlign:"right" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:12 }}>
        <Link href="/orders" className="neo-btn" style={{ padding:"12px 24px", borderRadius:12, fontSize:13, fontWeight:800, textDecoration:"none", color:N.muted, background:N.bg, boxShadow:N.raisedSm }}>
          ← All Orders
        </Link>
        <Link href="/reels/new" className="neo-btn" style={{ padding:"12px 24px", borderRadius:12, fontSize:13, fontWeight:800, textDecoration:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm }}>
          + New Order
        </Link>
      </div>
    </div>
  );
}
