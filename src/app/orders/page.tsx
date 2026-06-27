"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type OrderStatus = "All" | "DELIVERING" | "COMPLETED" | "QUEUED" | "FAILED" | "CANCELLED" | "PAUSED";

interface Order {
  id: string; status: string; viewsTarget: number; viewsDelivered: number;
  progressPct: number; curveStyle: string; createdAt: string;
  reel: { url: string; platform: string };
  panel: { name: string } | null;
  engagementEnabled: boolean;
  likesTarget: number; likesDelivered: number;
  savesTarget: number; savesDelivered: number;
  sharesTarget: number; sharesDelivered: number;
  commentsTarget: number; commentsDelivered: number;
}

const STATUS: Record<string, { color: string; bg: string; border: string; dot?: boolean }> = {
  QUEUED:     { color: "#818cf8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.2)" },
  DELIVERING: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)", dot: true },
  COMPLETED:  { color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)" },
  FAILED:     { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
  CANCELLED:  { color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)" },
  PAUSED:     { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)" },
  PENDING:    { color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)" },
};

const PLATFORM_ICON: Record<string, string> = { INSTAGRAM: "IG", TIKTOK: "TK", YOUTUBE: "YT" };
const PLATFORM_COLOR: Record<string, string> = { INSTAGRAM: "#e1306c", TIKTOK: "#00f2ea", YOUTUBE: "#ff0000" };
const FILTERS: OrderStatus[] = ["All", "DELIVERING", "COMPLETED", "QUEUED", "PAUSED", "FAILED", "CANCELLED"];
const CURVE_LABELS: Record<string, string> = { ORGANIC: "🌱 Organic", FAST: "⚡ Fast", AGGRESSIVE: "🔥 Aggressive" };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus>("All");

  const load = () => {
    fetch("/api/orders")
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "All" ? orders : orders.filter(o => o.status === filter);
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === "All" ? orders.length : orders.filter(o => o.status === f).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .order-card:hover { box-shadow: 10px 10px 24px rgba(0,0,0,0.7),-5px -5px 14px rgba(255,255,255,0.06) !important; transform: translateY(-1px); }
        .order-card { transition: all 0.2s; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.5px" }}>Orders</h1>
          <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
            {orders.length} total campaign{orders.length !== 1 ? "s" : ""}
            {orders.filter(o => o.status === "DELIVERING").length > 0 && (
              <span style={{ marginLeft: 10, color: "#F59E0B", fontWeight: 600 }}>
                · {orders.filter(o => o.status === "DELIVERING").length} live
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
            fontSize: 12, fontWeight: 600, background: "#111118",
            border: "none", color: "#64748b", cursor: "pointer",
            boxShadow: "4px 4px 12px rgba(0,0,0,0.6),-2px -2px 8px rgba(255,255,255,0.04)",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
          <Link href="/reels/new" style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9,
            fontSize: 12, fontWeight: 700, textDecoration: "none", color: "#08080c",
            background: "linear-gradient(135deg, #F59E0B, #F97316)",
            boxShadow: "0 4px 14px rgba(245,158,11,0.3)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#08080c" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Order
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {FILTERS.map(f => (
          (counts[f] > 0 || f === "All") ? (
            <button key={f} onClick={() => setFilter(f)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: "none",
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
              background: "#111118",
              color: filter === f ? "#F59E0B" : "#475569",
              boxShadow: filter === f ? "4px 4px 12px rgba(0,0,0,0.6),-2px -2px 8px rgba(255,255,255,0.04)" : "inset 3px 3px 8px rgba(0,0,0,0.5),inset -2px -2px 5px rgba(255,255,255,0.03)",
            }}>
              {f === "DELIVERING" && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", animation: "pulse 1.5s infinite", display: "inline-block" }} />
              )}
              {f === "All" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              <span style={{
                padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                background: "#111118",
                boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.5),inset -1px -1px 3px rgba(255,255,255,0.03)",
                color: filter === f ? "#F59E0B" : "#334155",
              }}>{counts[f]}</span>
            </button>
          ) : null
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", flexDirection: "column", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(245,158,11,0.15)", borderTopColor: "#F59E0B", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, color: "#334155" }}>Loading orders…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.018)",
          padding: "64px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8,
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
            {filter === "All" ? "No orders yet" : `No ${filter.toLowerCase()} orders`}
          </p>
          <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>Connect a panel and add a reel to start delivering views.</p>
          <Link href="/reels/new" style={{
            marginTop: 12, padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            textDecoration: "none", color: "#08080c", background: "linear-gradient(135deg, #F59E0B, #F97316)",
          }}>
            Create First Order →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((order, i) => {
            const st = STATUS[order.status] ?? STATUS.PENDING;
            const pct = Math.min(100, order.progressPct ?? 0);
            const platColor = PLATFORM_COLOR[order.reel.platform] ?? "#64748b";
            const platLabel = PLATFORM_ICON[order.reel.platform] ?? "??";
            const cleanUrl = order.reel.url.replace(/^https?:\/\/(www\.)?/, "");
            return (
              <Link key={order.id} href={`/orders/${order.id}`} className="order-card" style={{
                display: "flex", alignItems: "center", gap: 16, padding: "16px 18px",
                borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)", textDecoration: "none",
                transition: "all 0.15s", animation: `fadeUp ${0.2 + i * 0.04}s ease`,
              }}>
                {/* Platform badge */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: `${platColor}15`, border: `1px solid ${platColor}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900, color: platColor, letterSpacing: "0.5px",
                }}>
                  {platLabel}
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                      {cleanUrl.length > 50 ? cleanUrl.slice(0, 50) + "…" : cleanUrl}
                    </p>
                    <span style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 20,
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                    }}>
                      {st.dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, animation: "pulse 1.5s infinite", display: "inline-block" }} />}
                      {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4, transition: "width 0.6s ease",
                        width: `${pct}%`,
                        background: order.status === "COMPLETED"
                          ? "linear-gradient(90deg, #34d399, #10b981)"
                          : "linear-gradient(90deg, #F59E0B, #F97316)",
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: order.status === "COMPLETED" ? "#34d399" : "#F59E0B", flexShrink: 0 }}>
                      {pct}%
                    </span>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#475569", flexWrap: "wrap" }}>
                    <span>{(order.viewsDelivered ?? 0).toLocaleString()} / {(order.viewsTarget ?? 0).toLocaleString()} views</span>
                    {order.curveStyle && <span style={{ color: "#334155" }}>·</span>}
                    {order.curveStyle && <span>{CURVE_LABELS[order.curveStyle] ?? order.curveStyle}</span>}
                    {order.panel && <><span style={{ color: "#334155" }}>·</span><span>via {order.panel.name}</span></>}
                  </div>

                  {/* Engagement badges */}
                  {order.engagementEnabled && (order.likesTarget > 0 || order.savesTarget > 0) && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {order.likesTarget > 0 && (
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(244,114,182,0.08)", color: "#f472b6", border: "1px solid rgba(244,114,182,0.2)" }}>
                          ♥ {(order.likesDelivered ?? 0)}/{order.likesTarget}
                        </span>
                      )}
                      {order.savesTarget > 0 && (
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(129,140,248,0.08)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.2)" }}>
                          ⊞ {(order.savesDelivered ?? 0)}/{order.savesTarget}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Date + arrow */}
                <div style={{ flexShrink: 0, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#334155" }}>{new Date(order.createdAt).toLocaleDateString()}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
