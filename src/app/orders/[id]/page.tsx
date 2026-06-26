"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

/* ── Types ── */
interface ChartPoint { hour: number; planned: number; actual: number; status: string }
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

/* ── Status badge ── */
const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  PENDING:    { bg:"rgba(107,114,128,0.12)", color:"#9ca3af", dot:"#6b7280",  label:"Pending" },
  QUEUED:     { bg:"rgba(99,102,241,0.12)",  color:"#818cf8", dot:"#818cf8",  label:"Queued" },
  DELIVERING: { bg:"rgba(245,158,11,0.12)",  color:"#F59E0B", dot:"#F59E0B",  label:"Delivering" },
  COMPLETED:  { bg:"rgba(52,211,153,0.12)",  color:"#34d399", dot:"#34d399",  label:"Completed" },
  FAILED:     { bg:"rgba(248,113,113,0.12)", color:"#f87171", dot:"#f87171",  label:"Failed" },
  CANCELLED:  { bg:"rgba(107,114,128,0.12)", color:"#6b7280", dot:"#6b7280",  label:"Cancelled" },
  PAUSED:     { bg:"rgba(251,191,36,0.12)",  color:"#fbbf24", dot:"#fbbf24",  label:"Paused" },
};

/* ── Dual-layer delivery chart ── */
function DeliveryChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) return null;
  const W = 600, H = 160, pad = 16;
  const maxPlanned = Math.max(...data.map((d) => d.planned), 1);

  const toX = (i: number) => pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad);
  const toY = (v: number) => H - pad - (v / maxPlanned) * (H - 2 * pad);

  const plannedPts = data.map((d, i) => ({ x: toX(i), y: toY(d.planned) }));
  const actualPts  = data.map((d, i) => ({ x: toX(i), y: toY(d.actual) }));

  const makePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const makeFill = (pts: { x: number; y: number }[]) => [
    makePath(pts),
    `L ${pts.at(-1)!.x.toFixed(1)} ${(H - pad).toFixed(1)}`,
    `L ${pts[0].x.toFixed(1)} ${(H - pad).toFixed(1)} Z`,
  ].join(" ");

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{background:"rgba(245,158,11,0.5)"}} />Planned</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded bg-emerald-400" />Actual Delivered</span>
        <span className="text-gray-600 ml-auto">{data.length} batches</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="rounded-xl">
        <defs>
          <linearGradient id="planGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} y1={H - pad - f * (H - 2 * pad)} x2={W - pad} y2={H - pad - f * (H - 2 * pad)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
        ))}
        {/* Planned fill + line */}
        <path d={makeFill(plannedPts)} fill="url(#planGrad)" />
        <path d={makePath(plannedPts)} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="6 3" />
        {/* Actual fill + line */}
        <path d={makeFill(actualPts)} fill="url(#actGrad)" />
        <path d={makePath(actualPts)} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Hour x-labels */}
        {[0, Math.floor(data.length/4), Math.floor(data.length/2), Math.floor(3*data.length/4), data.length-1]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((i) => (
          <text key={i} x={toX(i)} y={H - 2} fill="#6b7280" fontSize="9" textAnchor="middle">h{data[i]?.hour ?? i}</text>
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
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F59E0B" strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x={size/2} y={size/2+2} fill="white" fontSize="18" fontWeight="700" textAnchor="middle"
        dominantBaseline="middle" transform={`rotate(90, ${size/2}, ${size/2})`}>{pct}%</text>
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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-red-400">{error || "Order not found"}</p>
      <Link href="/orders" className="text-amber-400 hover:underline text-sm">← Back to orders</Link>
    </div>
  );

  const { order, chartData, totalBatches, completedBatches, failedBatches } = data;
  const st = STATUS_STYLES[order.status] ?? STATUS_STYLES.PENDING;
  const isLive = order.status === "DELIVERING" || order.status === "QUEUED";
  const platformIcons: Record<string, string> = { INSTAGRAM:"📷", TIKTOK:"🎵", YOUTUBE:"▶️" };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/orders" className="text-gray-500 hover:text-white transition text-xl">←</Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">Order Detail</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                style={{ background: st.bg, color: st.color }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: st.dot }} />
                {st.label}
                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-1" />}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{platformIcons[order.reel.platform] ?? "🎬"} {order.reel.url.slice(0, 60)}{order.reel.url.length > 60 ? "…" : ""}</p>
          </div>
        </div>
        {/* Actions */}
        {(order.status === "DELIVERING" || order.status === "QUEUED") && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => handleAction("pause")} disabled={actioning}
              className="px-3 py-2 rounded-lg text-xs font-medium text-yellow-400 border hover:bg-yellow-400/10 transition"
              style={{ borderColor: "rgba(251,191,36,0.3)" }}>⏸ Pause</button>
            <button onClick={() => handleAction("cancel")} disabled={actioning}
              className="px-3 py-2 rounded-lg text-xs font-medium text-red-400 border hover:bg-red-400/10 transition"
              style={{ borderColor: "rgba(248,113,113,0.3)" }}>✕ Cancel</button>
          </div>
        )}
      </div>

      {/* ── Top stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ["🎯", "Target", order.viewsTarget.toLocaleString(), "views"],
          ["✅", "Delivered", order.viewsDelivered.toLocaleString(), "views"],
          ["⏳", "Remaining", order.viewsRemaining.toLocaleString(), "views"],
          ["🔌", "Panel", order.panel?.name ?? "None", order.panel?.status ?? ""],
        ].map(([icon, label, val, sub]) => (
          <div key={label} className="rounded-xl border p-4" style={{ background:"rgba(255,255,255,0.03)", borderColor:"rgba(255,255,255,0.07)" }}>
            <div className="text-xl mb-2">{icon}</div>
            <p className="text-lg font-bold text-white">{val}</p>
            <p className="text-xs text-gray-400">{label}</p>
            {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Engagement Metrics ── */}
      {order.engagementEnabled && (order.likesTarget > 0 || order.savesTarget > 0 || order.sharesTarget > 0 || order.commentsTarget > 0) && (
        <div className="rounded-2xl border p-6" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-white">Engagement Delivery</span>
            <span className="px-2 py-0.5 rounded-full text-xs text-emerald-400" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>On same S-curve as views</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "👍", label: "Likes",    delivered: order.likesDelivered,    target: order.likesTarget },
              { icon: "🔖", label: "Saves",    delivered: order.savesDelivered,    target: order.savesTarget },
              { icon: "📤", label: "Shares",   delivered: order.sharesDelivered,   target: order.sharesTarget },
              { icon: "💬", label: "Comments", delivered: order.commentsDelivered, target: order.commentsTarget },
            ].filter((e) => e.target > 0).map(({ icon, label, delivered, target }) => {
              const pct = target > 0 ? Math.min(100, Math.round((delivered / target) * 100)) : 0;
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{icon} {label}</span>
                    <span className="font-semibold text-white">{delivered.toLocaleString()} <span className="text-gray-600">/ {target.toLocaleString()}</span></span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #34d399, #10b981)" }} />
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border p-6 flex flex-col sm:flex-row items-center gap-6" style={{ background:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.07)" }}>
        <ProgressRing pct={order.progressPct} />
        <div className="flex-1 w-full">
          <div className="flex justify-between mb-2">
            <p className="font-semibold text-white">Delivery Progress</p>
            <p className="text-amber-400 font-bold">{order.progressPct}%</p>
          </div>
          <div className="w-full rounded-full h-3 overflow-hidden" style={{ background:"rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width:`${order.progressPct}%`, background:"linear-gradient(90deg, #F59E0B, #F97316)" }} />
          </div>
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <span>Batches: {completedBatches}/{totalBatches} done</span>
            {failedBatches > 0 && <span className="text-red-400">{failedBatches} failed</span>}
            <span>Style: {order.curveStyle}</span>
            <span>{order.durationHours}h campaign</span>
          </div>
          {isLive && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Live — auto-refreshes every 15s
            </div>
          )}
        </div>
      </div>

      {/* ── Live delivery chart ── */}
      <div className="rounded-2xl border p-6" style={{ background:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white text-lg">📈 Delivery Chart — Planned vs Actual</h3>
          <button onClick={fetchStatus} className="text-xs text-gray-500 hover:text-amber-400 transition">↻ Refresh</button>
        </div>
        {chartData.length > 0 ? (
          <DeliveryChart data={chartData} />
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
            No delivery data yet — delivery starts shortly
          </div>
        )}
      </div>

      {/* ── Batch event table ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.07)" }}>
        <div className="p-5 border-b" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
          <h3 className="font-semibold text-white">Delivery Batches</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
                {["Hour", "Views", "Scheduled", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.slice(0, 24).map((row, i) => {
                const evStyle: Record<string, string> = {
                  DONE:"#34d399", FAILED:"#f87171", EXECUTING:"#F59E0B",
                  SCHEDULED:"#6b7280", RETRYING:"#fbbf24",
                };
                return (
                  <tr key={i} className="border-b hover:bg-white/[0.02] transition" style={{ borderColor:"rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-2.5 text-gray-400">h{row.hour}</td>
                    <td className="px-4 py-2.5 text-white font-medium">{row.planned.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-gray-500">+{row.hour}h</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-semibold" style={{ color: evStyle[row.status] ?? "#6b7280" }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {chartData.length > 24 && (
          <div className="p-4 text-center text-xs text-gray-600">
            Showing first 24 of {chartData.length} batches
          </div>
        )}
      </div>

      {/* ── Order info ── */}
      <div className="rounded-2xl border p-5" style={{ background:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.07)" }}>
        <h3 className="font-semibold text-white mb-4">Order Info</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            ["Order ID", order.id.slice(0, 16) + "…"],
            ["Platform", `${platformIcons[order.reel.platform] ?? "🎬"} ${order.reel.platform}`],
            ["Curve Style", order.curveStyle],
            ["Duration", `${order.durationHours} hours`],
            ["Started", order.startedAt ? new Date(order.startedAt).toLocaleString() : "Pending"],
            ["Completed", order.completedAt ? new Date(order.completedAt).toLocaleString() : "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
              <span className="text-gray-500">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/orders" className="px-5 py-2.5 rounded-xl text-sm text-gray-400 border hover:bg-white/5 transition" style={{ borderColor:"rgba(255,255,255,0.08)" }}>
          ← All Orders
        </Link>
        <Link href="/reels/new" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F] hover:opacity-90 transition" style={{ background:"#F59E0B" }}>
          + New Order
        </Link>
      </div>
    </div>
  );
}
