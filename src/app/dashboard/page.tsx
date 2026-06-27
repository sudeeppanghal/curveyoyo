"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface DashStats {
  totalOrders: number;
  activeOrders: number;
  panelCount: number;
  reelCount: number;
  totalViewsDelivered: number;
  plan: string;
}

const QUICK_ACTIONS = [
  {
    href: "/panels",
    title: "Connect SMM Panel",
    desc: "Add your provider API",
    color: "#818cf8",
    bg: "rgba(129,140,248,0.08)",
    border: "rgba(129,140,248,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    href: "/reels/new",
    title: "Create New Order",
    desc: "Schedule organic delivery",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    href: "/orders",
    title: "View Orders",
    desc: "Track all campaigns",
    color: "#34d399",
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    href: "/analytics",
    title: "Analytics",
    desc: "Delivery performance",
    color: "#f472b6",
    bg: "rgba(244,114,182,0.08)",
    border: "rgba(244,114,182,0.2)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("Operator");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashStats>({
    totalOrders: 0, activeOrders: 0, panelCount: 0,
    reelCount: 0, totalViewsDelivered: 0, plan: "FREE",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setName(user.user_metadata?.name || user.email?.split("@")[0] || "Operator");
      // Load analytics stats
      fetch("/api/analytics")
        .then(r => r.json())
        .then(d => {
          setStats({
            totalOrders:         d.totalOrders ?? 0,
            activeOrders:        d.deliveringOrders ?? 0,
            panelCount:          d.activePanels ?? 0,
            reelCount:           0,
            totalViewsDelivered: d.totalViewsDelivered ?? 0,
            plan:                d.plan ?? "FREE",
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [router]);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const STAT_CARDS = [
    {
      label: "Views Delivered",
      value: (stats.totalViewsDelivered ?? 0).toLocaleString(),
      sub: "All time",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.06)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      ),
    },
    {
      label: "Active Orders",
      value: String(stats.activeOrders ?? 0),
      sub: "Running now",
      color: "#34d399",
      bg: "rgba(52,211,153,0.06)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
    },
    {
      label: "Panels Connected",
      value: String(stats.panelCount ?? 0),
      sub: stats.panelCount === 0 ? "Connect one →" : "Online",
      color: "#818cf8",
      bg: "rgba(129,140,248,0.06)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </svg>
      ),
    },
    {
      label: "Total Orders",
      value: String(stats.totalOrders ?? 0),
      sub: "All campaigns",
      color: "#f472b6",
      bg: "rgba(244,114,182,0.06)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.8" strokeLinecap="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      ),
    },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ position: "relative", width: 44, height: 44 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(245,158,11,0.15)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#F59E0B", animation: "spin 0.8s linear infinite" }} />
      </div>
      <p style={{ fontSize: 13, color: "#475569" }}>Loading dashboard…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Welcome hero ── */}
      <div style={{
        borderRadius: 20, padding: "28px 32px", position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(249,115,22,0.04) 100%)",
        border: "1px solid rgba(245,158,11,0.15)",
        animation: "fadeUp 0.4s ease",
      }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: -60, right: -20, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -20, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 11, fontWeight: 700, color: "#F59E0B" }}>
              ⚡ Free Trial Active
            </div>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
            {greeting}, {name} 👋
          </h2>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 22px", maxWidth: 480 }}>
            Your organic delivery engine is ready. Connect an SMM panel and schedule your first campaign.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/panels" style={{
              padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none",
              color: "#08080c", background: "linear-gradient(135deg, #F59E0B, #F97316)",
              boxShadow: "0 6px 20px rgba(245,158,11,0.35)", display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#08080c" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              Connect a Panel
            </Link>
            <Link href="/reels/new" style={{
              padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
              color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              New Order
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {STAT_CARDS.map(({ label, value, sub, color, bg, icon }, i) => (
          <div key={label} style={{
            padding: "20px 20px 18px", borderRadius: 16,
            border: `1px solid rgba(255,255,255,0.06)`,
            background: bg,
            animation: `fadeUp ${0.3 + i * 0.07}s ease`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -20, right: -10, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${color}18 0%, transparent 70%)` }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {icon}
              </div>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 3px", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>{value}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", margin: "0 0 2px" }}>{label}</p>
            <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Quick actions + Recent activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Quick Actions */}
        <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.018)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: "#fff", margin: 0 }}>Quick Actions</h3>
            <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0" }}>Jump to key features</p>
          </div>
          <div style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {QUICK_ACTIONS.map(({ href, title, desc, color, bg, border, icon }) => (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderRadius: 12, textDecoration: "none", border: `1px solid ${border}`,
                background: bg, transition: "all 0.15s",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{title}</p>
                  <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0" }}>{desc}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.018)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: "#fff", margin: 0 }}>Get Started</h3>
            <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0" }}>3 steps to organic growth</p>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { step: "1", title: "Connect Panel", desc: "Add your SMM provider API key and URL", color: "#818cf8", done: stats.panelCount > 0 },
              { step: "2", title: "Add Reel URL", desc: "Paste Instagram or TikTok reel link", color: "#F59E0B", done: stats.totalOrders > 0 },
              { step: "3", title: "Start Campaign", desc: "Choose S-curve style and target views", color: "#34d399", done: stats.activeOrders > 0 },
            ].map(({ step, title, desc, color, done }) => (
              <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800,
                  background: done ? `${color}20` : "rgba(255,255,255,0.05)",
                  border: `2px solid ${done ? color : "rgba(255,255,255,0.08)"}`,
                  color: done ? color : "#334155",
                }}>
                  {done ? "✓" : step}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: done ? "#e2e8f0" : "#64748b", margin: 0 }}>{title}</p>
                  <p style={{ fontSize: 11, color: "#334155", margin: "2px 0 0" }}>{desc}</p>
                </div>
              </div>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />
            <Link href="/reels/new" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "11px", borderRadius: 11, fontSize: 13, fontWeight: 700, textDecoration: "none",
              color: "#08080c", background: "linear-gradient(135deg, #F59E0B, #F97316)",
              boxShadow: "0 6px 20px rgba(245,158,11,0.3)",
            }}>
              Launch Your First Campaign →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Delivery curve preview ── */}
      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.018)", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: "#fff", margin: 0 }}>Delivery Activity</h3>
            <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0" }}>Last 7 days · Views delivered</p>
          </div>
          {stats.totalOrders === 0 && (
            <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 11, color: "#475569", fontWeight: 600 }}>
              No data yet
            </div>
          )}
        </div>
        {/* Placeholder chart */}
        <div style={{ position: "relative", height: 80 }}>
          <svg width="100%" height="80" viewBox="0 0 600 80" preserveAspectRatio="none" style={{ opacity: 0.25 }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0 78 Q150 78 300 78 Q450 78 600 78" fill="url(#chartGrad)"/>
            <path d="M0 78 Q150 78 300 78 Q450 78 600 78" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="6 4"/>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <p style={{ fontSize: 12, color: "#334155", margin: 0 }}>Place your first order to see delivery curves</p>
          </div>
        </div>
      </div>

    </div>
  );
}
