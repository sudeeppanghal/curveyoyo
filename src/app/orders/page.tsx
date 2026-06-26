"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type OrderStatus = "All" | "DELIVERING" | "COMPLETED" | "QUEUED" | "FAILED" | "CANCELLED" | "PAUSED";

interface Order {
  id: string; status: string; viewsTarget: number; viewsDelivered: number;
  progressPct: number; curveStyle: string; createdAt: string;
  reel: { url: string; platform: string };
  panel: { name: string } | null;
  // Engagement
  engagementEnabled: boolean;
  likesTarget: number; likesDelivered: number;
  savesTarget: number; savesDelivered: number;
  sharesTarget: number; sharesDelivered: number;
  commentsTarget: number; commentsDelivered: number;
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  PENDING:    { color:"#9ca3af", bg:"rgba(107,114,128,0.1)" },
  QUEUED:     { color:"#818cf8", bg:"rgba(99,102,241,0.1)" },
  DELIVERING: { color:"#F59E0B", bg:"rgba(245,158,11,0.1)" },
  COMPLETED:  { color:"#34d399", bg:"rgba(52,211,153,0.1)" },
  FAILED:     { color:"#f87171", bg:"rgba(248,113,113,0.1)" },
  CANCELLED:  { color:"#6b7280", bg:"rgba(107,114,128,0.1)" },
  PAUSED:     { color:"#fbbf24", bg:"rgba(251,191,36,0.1)" },
};

const PLATFORM_ICONS: Record<string, string> = { INSTAGRAM:"📷", TIKTOK:"🎵", YOUTUBE:"▶️" };
const FILTERS: OrderStatus[] = ["All","DELIVERING","COMPLETED","QUEUED","FAILED","CANCELLED","PAUSED"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus>("All");

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "All" ? orders : orders.filter((o) => o.status === filter);
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === "All" ? orders.length : orders.filter((o) => o.status === f).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-gray-400 text-sm mt-1">{orders.length} total deliveries</p>
        </div>
        <Link href="/reels/new" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F] hover:opacity-90 transition" style={{ background:"#F59E0B" }}>
          + New Order
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          counts[f] > 0 || f === "All" ? (
            <button key={f} onClick={() => setFilter(f)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={filter === f ? { background:"rgba(245,158,11,0.12)", color:"#F59E0B", border:"1px solid rgba(245,158,11,0.3)" } : { color:"#6b7280", border:"1px solid rgba(255,255,255,0.06)", background:"transparent" }}>
              {f === "All" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              <span className="px-1.5 py-0.5 rounded-md text-xs font-bold"
                style={{ background:"rgba(255,255,255,0.08)", color:filter === f ? "#F59E0B" : "#6b7280" }}>
                {counts[f]}
              </span>
            </button>
          ) : null
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border py-16 flex flex-col items-center text-center" style={{ background:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.06)" }}>
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-white mb-1">{filter === "All" ? "No orders yet" : `No ${filter.toLowerCase()} orders`}</p>
          <p className="text-gray-500 text-sm mb-5">Connect a panel and add a reel to start delivering.</p>
          <Link href="/reels/new" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F] hover:opacity-90 transition" style={{ background:"#F59E0B" }}>
            Create First Order →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const st = STATUS_STYLES[order.status] ?? STATUS_STYLES.PENDING;
            const isLive = order.status === "DELIVERING";
            return (
              <Link key={order.id} href={`/orders/${order.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border p-5 hover:border-white/10 transition-all group"
                style={{ background:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.06)" }}>
                {/* Platform icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background:"rgba(255,255,255,0.05)" }}>
                  {PLATFORM_ICONS[order.reel.platform] ?? "🎬"}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white truncate">{order.reel.url.replace("https://","").slice(0, 50)}…</p>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"
                      style={{ background:st.bg, color:st.color }}>
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                      {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.07)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width:`${order.progressPct}%`, background:"linear-gradient(90deg, #F59E0B, #F97316)" }} />
                    </div>
                    <span className="text-xs text-amber-400 font-semibold shrink-0">{order.progressPct}%</span>
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                    <span>{order.viewsDelivered.toLocaleString()} / {order.viewsTarget.toLocaleString()} views</span>
                    <span>{order.curveStyle.toLowerCase()}</span>
                    {order.panel && <span>via {order.panel.name}</span>}
                  </div>
                  {/* Engagement mini-badges */}
                  {order.engagementEnabled && (order.likesTarget > 0 || order.savesTarget > 0) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {order.likesTarget > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: "rgba(52,211,153,0.08)", color: "#34d399", border: "1px solid rgba(52,211,153,0.15)" }}>
                          👍 {order.likesDelivered.toLocaleString()}/{order.likesTarget.toLocaleString()}
                        </span>
                      )}
                      {order.savesTarget > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: "rgba(52,211,153,0.08)", color: "#34d399", border: "1px solid rgba(52,211,153,0.15)" }}>
                          🔖 {order.savesDelivered.toLocaleString()}/{order.savesTarget.toLocaleString()}
                        </span>
                      )}
                      {order.sharesTarget > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: "rgba(52,211,153,0.08)", color: "#34d399", border: "1px solid rgba(52,211,153,0.15)" }}>
                          📤 {order.sharesDelivered.toLocaleString()}/{order.sharesTarget.toLocaleString()}
                        </span>
                      )}
                      {order.commentsTarget > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: "rgba(52,211,153,0.08)", color: "#34d399", border: "1px solid rgba(52,211,153,0.15)" }}>
                          💬 {order.commentsDelivered.toLocaleString()}/{order.commentsTarget.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-xs text-gray-600 hidden sm:block">
                  {new Date(order.createdAt).toLocaleDateString()}
                </div>
                <span className="text-gray-600 group-hover:text-amber-400 transition hidden sm:block">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
