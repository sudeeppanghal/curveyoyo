"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalOrders: number; completedOrders: number; deliveringOrders: number;
  activePanels: number; totalViewsDelivered: number; successRate: number;
  weeklyChart: { date: string; label: string; views: number }[];
  styleBreakdown: { style: string; count: number }[];
  plan: string; trialEndsAt: string | null; lifetimeUnlocked: boolean;
}

function MiniBar({ views, max, label }: { views: number; max: number; label: string }) {
  const pct = max > 0 ? (views / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-7 shrink-0">{label}</span>
      <div className="flex-1 h-6 rounded-lg overflow-hidden relative" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-lg transition-all duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #F59E0B, #F97316)" }} />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
          {views > 0 ? views.toLocaleString() : "—"}
        </span>
      </div>
    </div>
  );
}

const STYLE_ICONS: Record<string, string> = { ORGANIC: "🌅", FAST: "⚡", AGGRESSIVE: "🔥" };

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
    </div>
  );

  if (!stats || stats.totalOrders === 0) return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <div className="rounded-2xl border py-20 flex flex-col items-center text-center" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="text-4xl mb-3">📊</div>
        <p className="font-semibold text-white mb-1">No data yet</p>
        <p className="text-gray-500 text-sm mb-5">Place your first order to start seeing analytics</p>
        <Link href="/reels/new" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F]" style={{ background: "#F59E0B" }}>
          Create First Order →
        </Link>
      </div>
    </div>
  );

  const maxViews = Math.max(...(stats.weeklyChart?.map((d) => d.views) ?? [1]), 1);
  const W = 500, H = 100, pad = 12;
  const chartPts = stats.weeklyChart ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time delivery performance</p>
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
          ↻ Live — 60s cache
        </div>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: "📦", label: "Total Orders",    val: stats.totalOrders.toLocaleString(),          sub: `${stats.deliveringOrders} active` },
          { icon: "✅", label: "Completed",        val: stats.completedOrders.toLocaleString(),       sub: `${stats.successRate}% success rate` },
          { icon: "👁", label: "Views Delivered",  val: stats.totalViewsDelivered.toLocaleString(),  sub: "across all campaigns" },
          { icon: "🔌", label: "Active Panels",   val: stats.activePanels.toLocaleString(),          sub: "connected panels" },
        ].map(({ icon, label, val, sub }) => (
          <div key={label} className="rounded-2xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="text-2xl mb-3">{icon}</div>
            <p className="text-2xl font-black text-white">{val}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
            <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── 7-day bar chart ── */}
      <div className="rounded-2xl border p-6" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
        <h3 className="font-semibold text-white mb-5">📈 Views Delivered — Last 7 Days</h3>
        {chartPts.length > 0 ? (
          <>
            <div className="space-y-2.5">
              {chartPts.map((d) => (
                <MiniBar key={d.date} views={d.views} max={maxViews} label={d.label} />
              ))}
            </div>
            {/* SVG line overlay */}
            {chartPts.some((d) => d.views > 0) && (
              <div className="mt-6">
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="rounded-xl">
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
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
                        <path d={fill} fill="url(#aGrad)" />
                        <path d={line} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#F59E0B" />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-600 text-sm">No delivery data in last 7 days</p>
        )}
      </div>

      {/* ── Bottom row ── */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Curve style breakdown */}
        <div className="rounded-2xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="font-semibold text-white mb-4">Delivery Styles Used</h3>
          {stats.styleBreakdown.length > 0 ? (
            <div className="space-y-3">
              {stats.styleBreakdown.map(({ style, count }) => (
                <div key={style} className="flex items-center gap-3">
                  <span className="text-xl">{STYLE_ICONS[style] ?? "📊"}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">{style.charAt(0) + style.slice(1).toLowerCase()}</span>
                      <span className="text-sm font-semibold text-amber-400">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / stats.totalOrders) * 100}%`, background: "#F59E0B" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No orders yet</p>
          )}
        </div>

        {/* Order status pie */}
        <div className="rounded-2xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="font-semibold text-white mb-4">Order Status Summary</h3>
          <div className="space-y-3">
            {[
              { label: "Completed",  count: stats.completedOrders,                                     color: "#34d399" },
              { label: "Delivering", count: stats.deliveringOrders,                                    color: "#F59E0B" },
              { label: "Other",      count: stats.totalOrders - stats.completedOrders - stats.deliveringOrders, color: "#6b7280" },
            ].filter((r) => r.count > 0).map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-300">{label}</span>
                    <span className="text-sm font-semibold" style={{ color }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(count / stats.totalOrders) * 100}%`, background: color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-xs text-gray-500">Success rate</span>
            <span className="text-lg font-black text-white">{stats.successRate}%</span>
          </div>
        </div>
      </div>

      <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-amber-400 hover:underline">
        View all orders →
      </Link>
    </div>
  );
}
