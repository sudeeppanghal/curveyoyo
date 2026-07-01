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
  failReason?: string | null;
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
  faint:    "#a0aec0",
  border:   "rgba(200, 208, 231, 0.4)",
};

const STATUS: Record<string, { color: string; bg: string; dot?: boolean }> = {
  QUEUED:     { color: "#4f46e5", bg: "rgba(79, 70, 229, 0.12)" },
  DELIVERING: { color: "#d97706", bg: "rgba(217, 119, 6, 0.12)", dot: true },
  COMPLETED:  { color: "#16a34a", bg: "rgba(22, 163, 74, 0.12)" },
  FAILED:     { color: "#dc2626", bg: "rgba(220, 38, 38, 0.12)" },
  CANCELLED:  { color: "#4b5563", bg: "rgba(75, 85, 99, 0.12)" },
  PAUSED:     { color: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
  PENDING:    { color: "#4b5563", bg: "rgba(75, 85, 99, 0.12)" },
};

const PLATFORM_ICON: Record<string, string> = { INSTAGRAM: "📷", TIKTOK: "🎵", YOUTUBE: "▶️", TELEGRAM: "✈️", FACEBOOK: "📘", TWITTER: "🐦" };
const FILTERS: OrderStatus[] = ["All", "DELIVERING", "COMPLETED", "QUEUED", "PAUSED", "FAILED", "CANCELLED"];
const CURVE_LABELS: Record<string, string> = {
  ORGANIC: "🌱 Organic", FAST: "⚡ Fast", AGGRESSIVE: "🔥 Aggressive",
  WHOP: "💳 Whop", CLIPSTAKE: "🎲 Clipstake", CLIPSTAR: "⭐ Clipstar",
  PICSART: "🎨 Picsart", CROSSWAVE: "🌊 Crosswave"
};

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
        .order-card:hover { box-shadow: 10px 10px 24px #c8d0e7,-5px -5px 14px #ffffff !important; transform: translateY(-1px); }
        .order-card { transition: all 0.2s; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Orders</h1>
          <p style={{ fontSize: 13, color: N.muted, margin: 0, fontWeight: 600 }}>
            {orders.length} total campaign{orders.length !== 1 ? "s" : ""}
            {orders.filter(o => o.status === "DELIVERING").length > 0 && (
              <span style={{ marginLeft: 10, color: N.accent, fontWeight: 700 }}>
                · {orders.filter(o => o.status === "DELIVERING").length} live
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
            fontSize: 12, fontWeight: 700, background: N.bg,
            border: "none", color: N.muted, cursor: "pointer",
            boxShadow: N.raisedSm,
          }} className="neo-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
          <Link href="/reels/new" style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
            fontSize: 12, fontWeight: 800, textDecoration: "none", color: "#ffffff",
            background: N.accentBg,
            boxShadow: N.raisedSm,
          }} className="neo-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Order
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {FILTERS.map(f => (
          (counts[f] > 0 || f === "All") ? (
            <button key={f} onClick={() => setFilter(f)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: "none",
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
              background: N.bg,
              color: filter === f ? N.accent : N.muted,
              boxShadow: filter === f ? N.raisedSm : N.inset,
            }}>
              {f === "DELIVERING" && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: N.accent, animation: "pulse 1.5s infinite", display: "inline-block" }} />
              )}
              {f === "All" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              <span style={{
                padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 800,
                background: N.bg,
                boxShadow: filter === f ? N.inset : N.raisedSm,
                color: filter === f ? N.accent : N.muted,
              }}>{counts[f]}</span>
            </button>
          ) : null
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", flexDirection: "column", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(217,119,6,0.15)", borderTopColor: N.accent, animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ borderRadius: 20, padding: 60, textAlign: "center", background: N.bg, boxShadow: N.raised }}>
          <span style={{ fontSize: 36 }}>📋</span>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: N.text, margin: "12px 0 4px" }}>No orders found</h3>
          <p style={{ fontSize: 13, color: N.muted, margin: "0 0 20px" }}>
            {filter === "All" ? "You haven't placed any campaigns yet." : `No campaigns found with status ${filter.toLowerCase()}.`}
          </p>
          {filter === "All" && (
            <Link href="/reels/new" style={{
              display: "inline-flex", padding: "10px 24px", borderRadius: 10,
              fontSize: 13, fontWeight: 800, color: "#ffffff", background: N.accentBg,
              boxShadow: N.raisedSm, textDecoration: "none"
            }} className="neo-btn">
              Create Campaign →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map(o => {
            const st = STATUS[o.status] ?? STATUS.PENDING;
            return (
              <div key={o.id} className="order-card" style={{
                borderRadius: 20, padding: 20, background: N.bg, boxShadow: N.raised,
                display: "flex", flexDirection: "column", gap: 16,
              }}>
                {/* Header info */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 10, background: N.bg, boxShadow: N.inset, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                      {PLATFORM_ICON[o.reel.platform.toUpperCase()] ?? "🎬"}
                    </span>
                    <div>
                      <a href={o.reel.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 800, color: N.accent, textDecoration: "none" }}>
                        {o.reel.url.length > 36 ? o.reel.url.slice(0, 36) + "…" : o.reel.url}
                      </a>
                      <p style={{ fontSize: 11, color: N.muted, margin: "2px 0 0", fontWeight: 600 }}>
                        ID: <span style={{ fontFamily: "monospace", color: N.text, userSelect: "all" }}>{o.id}</span> · {new Date(o.createdAt).toLocaleDateString()} · {CURVE_LABELS[o.curveStyle] ?? o.curveStyle}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: st.color, background: N.bg,
                      padding: "4px 12px", borderRadius: 20, boxShadow: N.inset,
                      display: "flex", alignItems: "center", gap: 6
                    }}>
                      {st.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color, animation: "pulse 1.5s infinite", display: "inline-block" }} />}
                      {o.status}
                    </span>
                  </div>
                </div>

                {o.failReason && (
                  <div style={{
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(220,38,38,0.06)",
                    border: "1px solid rgba(220,38,38,0.15)",
                    color: "#dc2626",
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    ⚠️ Campaign Delivery Failed (Please check if your profile/post is public, or contact support if the problem persists)
                  </div>
                )}

                {/* Progress bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    <span style={{ color: N.text }}>Views Pacing</span>
                    <span style={{ color: N.accent }}>{o.viewsDelivered.toLocaleString()} / {o.viewsTarget.toLocaleString()} ({Math.round(o.progressPct)}%)</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 10, background: N.bg, boxShadow: N.inset, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 10, background: N.accentBg,
                      width: `${Math.min(100, o.progressPct)}%`, transition: "width 0.4s"
                    }} />
                  </div>
                </div>

                {/* Engagement sub-states */}
                {o.engagementEnabled && (
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10,
                    padding: 14, borderRadius: 14, background: N.bg, boxShadow: N.inset
                  }}>
                    {[
                      { icon: "👍", label: "Likes", cur: o.likesDelivered, tgt: o.likesTarget },
                      { icon: "🔖", label: "Saves", cur: o.savesDelivered, tgt: o.savesTarget },
                      { icon: "📤", label: "Shares", cur: o.sharesDelivered, tgt: o.sharesTarget },
                      { icon: "💬", label: "Comments", cur: o.commentsDelivered, tgt: o.commentsTarget },
                    ].filter(e => e.tgt > 0).map(e => (
                      <div key={e.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, color: N.muted, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <span>{e.icon}</span><span>{e.label}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: N.text }}>
                          {e.cur} <span style={{ color: N.faint, fontSize: 10 }}>/ {e.tgt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
