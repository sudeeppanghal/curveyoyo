"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminSettings {
  trc20Address: string | null; bep20Address: string | null;
  priceUsdt: number; siteName: string; freeTrialHours: number;
  maintenanceMode: boolean; supportEmail: string | null;
}

interface User {
  id: string; email: string; name: string | null; plan: string;
  createdAt: string; lifetimeUnlocked: boolean;
  _count: { orders: number; panels: number };
  subscription: { status: string; paidAt: string } | null;
}

interface Payment {
  id: string; txHash: string; network: string; status: string;
  amountUsdt: number | null; createdAt: string;
  user: { email: string; name: string | null };
}

type AdminTab = "settings" | "users" | "payments" | "campaigns" | "system";

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

const PLAN_COLORS: Record<string, string> = {
  FREE: "#718096", TRIAL: "#4f46e5", LIFETIME: "#16a34a",
  SUSPENDED: "#dc2626",
};

export default function AdminPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<AdminTab>("settings");
  const [settings, setSettings] = useState<AdminSettings>({ trc20Address: "", bep20Address: "", priceUsdt: 20, siteName: "YoyoSMM", freeTrialHours: 24, maintenanceMode: false, supportEmail: "" });
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [systemData, setSystemData] = useState<{
    events: any[];
    panels: any[];
    orderStats: { status: string; count: number }[];
    eventStats: { status: string; count: number }[];
  }>({ events: [], panels: [], orderStats: [], eventStats: [] });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState("All");

  const headers = { "Content-Type": "application/json", "x-admin-secret": secret };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      // Check auth first with settings
      const sRes = await fetch("/api/admin/settings", { headers });
      if (sRes.status === 403) {
        setError("Wrong admin secret");
        setAuthed(false);
        setLoading(false);
        return;
      }
      if (!sRes.ok) {
        setError(`Server error ${sRes.status} — check DATABASE_URL in Vercel env vars`);
        setLoading(false);
        return;
      }
      const s = await sRes.json();
      if (s.settings) setSettings(s.settings);
      setAuthed(true);

      // Load remaining in parallel, fail gracefully
      const [uRes, pRes, oRes, sysRes] = await Promise.all([
        fetch("/api/admin/users",    { headers }),
        fetch("/api/admin/payments", { headers }),
        fetch("/api/admin/orders",   { headers }),
        fetch("/api/admin/system",   { headers }),
      ]);
      if (uRes.ok)   { const u = await uRes.json();   setUsers(u.users ?? []); }
      if (pRes.ok)   { const p = await pRes.json();   setPayments(p.payments ?? []); }
      if (oRes.ok)   { const o = await oRes.json();   setOrders(o.orders ?? []); }
      if (sysRes.ok) { const sys = await sysRes.json(); setSystemData(sys ?? { events: [], panels: [], orderStats: [], eventStats: [] }); }
    } catch (e) {
      setError(`Network error: ${String(e)}`);
    }
    setLoading(false);
  };

  const handleCampaignAction = async (orderId: string, action: "pause" | "resume" | "cancel" | "refill") => {
    setSaved("Processing…");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ orderId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(action === "refill" ? "Refill triggered!" : "Campaign updated!");
        setTimeout(() => setSaved(""), 2000);
        loadAll();
      } else {
        setError(data.error ?? "Action failed");
        setTimeout(() => setError(""), 3000);
      }
    } catch (e) {
      setError(String(e));
      setTimeout(() => setError(""), 3000);
    }
  };

  const saveSettings = async () => {
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers, body: JSON.stringify(settings) });
    if (res.ok) { setSaved("Saved!"); setTimeout(() => setSaved(""), 2000); }
    else setError("Save failed");
  };

  const userAction = async (userId: string, action: "upgrade" | "suspend" | "unsuspend") => {
    await fetch("/api/admin/users", { method: "PATCH", headers, body: JSON.stringify({ userId, action }) });
    loadAll();
  };

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: N.bg }}>
      <style>{`
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
      `}</style>
      <div className="w-full max-w-sm rounded-2xl p-8 space-y-6" style={{ background: N.bg, boxShadow: N.raised }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-black text-white" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Y</div>
          <h1 className="text-xl font-black" style={{ color: N.text }}>Admin Panel</h1>
          <p style={{ color: N.muted, fontSize: 13, fontWeight: 600, marginTop: 4 }}>Enter admin secret key to continue</p>
        </div>
        <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadAll()}
          placeholder="Admin secret key…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none neo-input"
          style={{ background: N.bg, border: "none", color: N.text, boxShadow: N.inset, fontFamily: "inherit" }} />
        {error && <p style={{ color: "#dc2626", fontSize: 12, fontWeight: 700, margin: 0 }}>⚠️ {error}</p>}
        <button onClick={loadAll} className="w-full py-3 rounded-xl font-bold text-white neo-btn" style={{ background: N.accentBg, border: "none", cursor: "pointer", boxShadow: N.raisedSm }}>
          Enter Admin Panel →
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: N.bg }}>
      <style>{`
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Y</div>
            <div>
              <h1 className="text-xl font-black" style={{ color: N.text, margin: 0 }}>YoyoSMM Admin</h1>
              <p style={{ color: N.muted, fontSize: 12, fontWeight: 600, margin: 0 }}>Manage platform and global settings</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {saved && <span className="px-3 py-1.5 rounded-lg text-xs text-emerald-600 font-bold" style={{ background: "rgba(22,163,74,0.1)", boxShadow: N.inset }}>✓ {saved}</span>}
            <button onClick={() => router.push("/dashboard")} className="px-3 py-1.5 rounded-lg text-xs font-bold neo-btn" style={{ background: N.bg, border: "none", color: N.muted, boxShadow: N.raisedSm, cursor: "pointer" }}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            ["👥", "Total Users", users.length],
            ["💎", "Lifetime", users.filter((u) => u.plan === "LIFETIME").length],
            ["🔄", "Free Trial", users.filter((u) => u.plan === "FREE" || u.plan === "TRIAL").length],
            ["💰", "Revenue", `$${payments.filter((p) => p.status === "CONFIRMED").reduce((a, p) => a + (p.amountUsdt ?? 0), 0).toFixed(0)} USDT`],
          ].map(([icon, label, val]) => (
            <div key={String(label)} className="rounded-xl p-4" style={{ background: N.bg, boxShadow: N.raised }}>
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xl font-black" style={{ color: N.text, margin: 0 }}>{val}</p>
              <p style={{ color: N.muted, fontSize: 11, fontWeight: 700, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["settings", "users", "payments", "campaigns", "system"] as AdminTab[]).map((t) => {
            const iconMap: Record<AdminTab, string> = {
              settings: "⚙️ ",
              users: "👥 ",
              payments: "💰 ",
              campaigns: "📦 ",
              system: "⚡ "
            };
            return (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all neo-btn"
                style={{
                  border: "none", cursor: "pointer",
                  background: N.bg,
                  color: tab === t ? N.accent : N.muted,
                  boxShadow: tab === t ? N.inset : N.raisedSm
                }}>
                {iconMap[t]}{t}
              </button>
            );
          })}
        </div>

        {/* ── SETTINGS TAB ─── */}
        {tab === "settings" && (
          <div className="space-y-5">
            <div className="rounded-2xl p-6" style={{ background: N.bg, boxShadow: N.raised }}>
              <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, marginBottom: 20 }}>💳 Crypto Wallet Addresses</h2>
              <div className="space-y-4">
                {[
                  { key: "trc20Address", label: "🔷 USDT TRC20 Address (TRON)", placeholder: "T..." },
                  { key: "bep20Address", label: "🔶 USDT BEP20 Address (BSC)", placeholder: "0x..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: N.muted, marginBottom: 8 }}>{label}</label>
                    <input value={(settings as unknown as Record<string, string>)[key] ?? ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none neo-input"
                      style={{ background: N.bg, border: "none", color: N.text, boxShadow: N.inset }} />
                  </div>
                ))}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: N.muted, marginBottom: 8 }}>💵 Price (USDT)</label>
                    <input type="number" value={settings.priceUsdt} onChange={(e) => setSettings((p) => ({ ...p, priceUsdt: parseFloat(e.target.value) }))}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none neo-input"
                      style={{ background: N.bg, border: "none", color: N.text, boxShadow: N.inset }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: N.muted, marginBottom: 8 }}>⏱ Free Trial Hours</label>
                    <input type="number" value={settings.freeTrialHours} onChange={(e) => setSettings((p) => ({ ...p, freeTrialHours: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none neo-input"
                      style={{ background: N.bg, border: "none", color: N.text, boxShadow: N.inset }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: N.muted, marginBottom: 8 }}>📧 Support Email</label>
                  <input value={settings.supportEmail ?? ""} onChange={(e) => setSettings((p) => ({ ...p, supportEmail: e.target.value }))}
                    placeholder="support@yoyosmm.online"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none neo-input"
                    style={{ background: N.bg, border: "none", color: N.text, boxShadow: N.inset }} />
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: N.bg, boxShadow: N.inset }}>
                  <input type="checkbox" id="maintenance" checked={settings.maintenanceMode}
                    onChange={(e) => setSettings((p) => ({ ...p, maintenanceMode: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: N.accent, cursor: "pointer" }} />
                  <label htmlFor="maintenance" style={{ fontSize: 13, color: N.text, fontWeight: 700, cursor: "pointer" }}>🔧 Maintenance Mode (shows maintenance page to users)</label>
                </div>
              </div>
              <button onClick={saveSettings} className="mt-5 px-6 py-3 rounded-xl font-bold text-white neo-btn" style={{ background: N.accentBg, border: "none", cursor: "pointer", boxShadow: N.raisedSm }}>
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* ── USERS TAB ─── */}
        {tab === "users" && (
          <div className="rounded-2xl overflow-hidden" style={{ background: N.bg, boxShadow: N.raised }}>
            <div className="p-5 border-b" style={{ borderColor: N.border }}>
              <h2 style={{ color: N.text, fontSize: 14, fontWeight: 900, margin: 0 }}>Platform Registered Users ({users.length})</h2>
            </div>
            {users.length === 0 ? (
              <div className="py-12 text-center text-sm font-semibold" style={{ color: N.muted }}>No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr style={{ color: N.muted, borderBottom: `1px solid ${N.border}`, fontWeight: 800 }}>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Plan Status</th>
                      <th className="px-4 py-3">Connected Panels</th>
                      <th className="px-4 py-3">Total Campaigns</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b" style={{ borderColor: N.border }}>
                        <td className="px-4 py-3 font-semibold" style={{ color: N.text }}>{u.email}</td>
                        <td className="px-4 py-3" style={{ color: N.muted }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: PLAN_COLORS[u.plan] + "1A", color: PLAN_COLORS[u.plan] }}>
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold" style={{ color: N.text }}>{u._count?.panels ?? 0} panels</td>
                        <td className="px-4 py-3 font-bold" style={{ color: N.text }}>{u._count?.orders ?? 0} campaigns</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {u.plan !== "LIFETIME" && (
                              <button onClick={() => userAction(u.id, "upgrade")} className="px-2 py-1 rounded text-xs font-bold neo-btn" style={{ background: N.bg, border: "none", color: "#16a34a", cursor: "pointer", boxShadow: N.raisedSm }}>
                                Upgrade Lifetime
                              </button>
                            )}
                            {u.plan !== "SUSPENDED" ? (
                              <button onClick={() => userAction(u.id, "suspend")} className="px-2 py-1 rounded text-xs font-bold neo-btn" style={{ background: N.bg, border: "none", color: "#dc2626", cursor: "pointer", boxShadow: N.raisedSm }}>
                                Suspend
                              </button>
                            ) : (
                              <button onClick={() => userAction(u.id, "unsuspend")} className="px-2 py-1 rounded text-xs font-bold neo-btn" style={{ background: N.bg, border: "none", color: N.accent, cursor: "pointer", boxShadow: N.raisedSm }}>
                                Unsuspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS TAB ─── */}
        {tab === "payments" && (
          <div className="rounded-2xl overflow-hidden" style={{ background: N.bg, boxShadow: N.raised }}>
            <div className="p-5 border-b" style={{ borderColor: N.border }}>
              <h2 style={{ color: N.text, fontSize: 14, fontWeight: 900, margin: 0 }}>Crypto Payments ({payments.length})</h2>
            </div>
            {payments.length === 0 ? (
              <div className="py-12 text-center text-sm font-semibold" style={{ color: N.muted }}>No payments yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr style={{ color: N.muted, borderBottom: `1px solid ${N.border}`, fontWeight: 800 }}>
                      {["User", "Network", "TXID", "Amount", "Status", "Date"].map((h) => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const statusColors: Record<string, string> = { CONFIRMED: "#16a34a", PENDING: "#d97706", FAILED: "#dc2626", VERIFYING: "#2563eb" };
                      return (
                        <tr key={p.id} className="border-b" style={{ borderColor: N.border }}>
                          <td className="px-4 py-3 font-semibold" style={{ color: N.text }}>{p.user?.email}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: p.network === "TRC20" ? "rgba(37,99,235,0.1)" : "rgba(217,119,6,0.1)", color: p.network === "TRC20" ? "#2563eb" : "#d97706" }}>
                              {p.network}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code style={{ color: N.accent, fontSize: 12, fontWeight: 700 }}>{p.txHash.slice(0, 16)}…</code>
                          </td>
                          <td className="px-4 py-3 font-black" style={{ color: N.text }}>{p.amountUsdt ? `$${p.amountUsdt}` : "—"}</td>
                          <td className="px-4 py-3">
                            <span style={{ color: statusColors[p.status] ?? "#718096" }} className="text-xs font-bold">{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: N.muted }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── CAMPAIGNS TAB ─── */}
        {tab === "campaigns" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search by Email, Reel URL, or ID…"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none neo-input"
                style={{ background: N.bg, border: "none", color: N.text, boxShadow: N.inset }}
              />
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm outline-none neo-btn"
                style={{ border: "none", background: N.bg, color: N.text, boxShadow: N.raisedSm, cursor: "pointer", fontWeight: 700 }}
              >
                <option value="All">All Statuses</option>
                <option value="DELIVERING">Delivering</option>
                <option value="COMPLETED">Completed</option>
                <option value="PAUSED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="FAILED">Failed</option>
                <option value="QUEUED">Queued</option>
              </select>
            </div>

            <div className="rounded-2xl overflow-hidden animate-fade-in" style={{ background: N.bg, boxShadow: N.raised }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr style={{ color: N.muted, borderBottom: `1px solid ${N.border}`, fontWeight: 800 }}>
                      {["User & Reel", "Speed & Curve", "Delivery Targets", "Status", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter((o) => {
                        const matchesQuery =
                          o.user.email.toLowerCase().includes(orderQuery.toLowerCase()) ||
                          o.reel.url.toLowerCase().includes(orderQuery.toLowerCase()) ||
                          o.id.toLowerCase().includes(orderQuery.toLowerCase());
                        const matchesFilter = orderFilter === "All" || o.status === orderFilter;
                        return matchesQuery && matchesFilter;
                      })
                      .map((o) => {
                        const statusColors: Record<string, string> = { DELIVERING: "#d97706", COMPLETED: "#16a34a", PAUSED: "#718096", CANCELLED: "#dc2626", FAILED: "#dc2626", QUEUED: "#2563eb" };
                        return (
                          <tr key={o.id} className="border-b" style={{ borderColor: N.border }}>
                            <td className="px-4 py-3">
                              <p className="font-bold" style={{ color: N.text, margin: 0 }}>{o.user?.email}</p>
                              <a href={o.reel?.url} target="_blank" rel="noreferrer" className="text-xs hover:underline block truncate max-w-xs mt-0.5" style={{ color: N.accent, fontWeight: 600 }}>{o.reel?.url}</a>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(217,119,6,0.1)", color: N.accent }}>
                                {o.curveStyle}
                              </span>
                              <p style={{ color: N.muted, fontSize: 11, margin: "4px 0 0" }}>{o.durationHours} hours schedule</p>
                            </td>
                            <td className="px-4 py-3">
                              <p style={{ color: N.text, margin: 0, fontWeight: 700 }}>👁 {o.viewsTarget.toLocaleString()} views</p>
                              <p style={{ color: N.muted, fontSize: 11, margin: "2px 0 0" }}>
                                {o.likesTarget > 0 && `👍 ${o.likesTarget.toLocaleString()} `}
                                {o.savesTarget > 0 && `🔖 ${o.savesTarget.toLocaleString()} `}
                                {o.commentsTarget > 0 && `💬 ${o.commentsTarget.toLocaleString()}`}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-bold" style={{ color: statusColors[o.status] ?? "#718096" }}>{o.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {o.status === "DELIVERING" && (
                                  <button onClick={() => handleCampaignAction(o.id, "pause")} className="px-2 py-1 rounded text-xs font-bold neo-btn" style={{ background: N.bg, border: "none", color: N.accent, cursor: "pointer", boxShadow: N.raisedSm }}>
                                    Pause
                                  </button>
                                )}
                                {o.status === "PAUSED" && (
                                  <button onClick={() => handleCampaignAction(o.id, "resume")} className="px-2 py-1 rounded text-xs font-bold neo-btn" style={{ background: N.bg, border: "none", color: "#16a34a", cursor: "pointer", boxShadow: N.raisedSm }}>
                                    Resume
                                  </button>
                                )}
                                {["DELIVERING", "PAUSED", "QUEUED"].includes(o.status) && (
                                  <button onClick={() => handleCampaignAction(o.id, "cancel")} className="px-2 py-1 rounded text-xs font-bold neo-btn" style={{ background: N.bg, border: "none", color: "#dc2626", cursor: "pointer", boxShadow: N.raisedSm }}>
                                    Cancel
                                  </button>
                                )}
                                {["DELIVERING", "COMPLETED"].includes(o.status) && (
                                  <button onClick={() => handleCampaignAction(o.id, "refill")} className="px-2 py-1 rounded text-xs font-bold neo-btn" style={{ background: N.bg, border: "none", color: "#16a34a", cursor: "pointer", boxShadow: N.raisedSm }} title="Query status & place refill if partial">
                                    Refill
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SYSTEM HEALTH TAB ─── */}
        {tab === "system" && (
          <div className="space-y-6">
            {/* Status counts grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl p-4" style={{ background: N.bg, boxShadow: N.raised }}>
                <p style={{ color: N.muted, fontSize: 11, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Active Campaigns</p>
                <p className="text-2xl font-black mt-1" style={{ color: N.accent, margin: 0 }}>
                  {orders.filter((o) => ["DELIVERING", "QUEUED"].includes(o.status)).length}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: N.bg, boxShadow: N.raised }}>
                <p style={{ color: N.muted, fontSize: 11, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Completed Campaigns</p>
                <p className="text-2xl font-black mt-1" style={{ color: "#16a34a", margin: 0 }}>
                  {orders.filter((o) => o.status === "COMPLETED").length}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: N.bg, boxShadow: N.raised }}>
                <p style={{ color: N.muted, fontSize: 11, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Scheduled Ticks</p>
                <p className="text-2xl font-black mt-1" style={{ color: N.text, margin: 0 }}>
                  {systemData.eventStats.find((s) => s.status === "SCHEDULED")?.count ?? 0}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: N.bg, boxShadow: N.raised }}>
                <p style={{ color: N.muted, fontSize: 11, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Failed Ticks</p>
                <p className="text-2xl font-black mt-1" style={{ color: "#dc2626", margin: 0 }}>
                  {systemData.eventStats.find((s) => s.status === "FAILED")?.count ?? 0}
                </p>
              </div>
            </div>

            {/* Panels Diagnostics */}
            <div className="rounded-2xl overflow-hidden" style={{ background: N.bg, boxShadow: N.raised }}>
              <div className="p-4 border-b" style={{ borderColor: N.border }}>
                <h3 style={{ color: N.text, fontSize: 14, fontWeight: 900, margin: 0 }}>Global User Panel Connections ({systemData.panels.length})</h3>
              </div>
              {systemData.panels.length === 0 ? (
                <p className="p-4 text-xs font-semibold" style={{ color: N.muted, margin: 0 }}>No panel APIs connected yet</p>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ color: N.muted, borderBottom: `1px solid ${N.border}`, fontWeight: 800 }}>
                        {["User", "Panel Name", "API URL", "Status", "Latency", "Success %"].map((h) => (
                          <th key={h} className="px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {systemData.panels.map((p) => {
                        const colors: Record<string, string> = { ONLINE: "text-emerald-600", OFFLINE: "text-red-600", SLOW: "text-amber-600", UNKNOWN: "text-gray-500" };
                        return (
                          <tr key={p.id} className="border-b" style={{ borderColor: N.border }}>
                            <td className="px-4 py-2.5" style={{ color: N.muted }}>{p.user?.email}</td>
                            <td className="px-4 py-2.5 font-bold" style={{ color: N.text }}>{p.name}</td>
                            <td className="px-4 py-2.5 truncate max-w-xs" style={{ color: N.muted }}>{p.apiUrl}</td>
                            <td className="px-4 py-2.5">
                              <span className={`font-bold ${colors[p.status] ?? "text-gray-500"}`}>{p.status}</span>
                            </td>
                            <td className="px-4 py-2.5 font-bold" style={{ color: N.text }}>{p.lastResponseMs ? `${p.lastResponseMs}ms` : "—"}</td>
                            <td className="px-4 py-2.5 font-bold" style={{ color: N.text }}>{p.successRate.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Queue Events Ticks */}
            <div className="rounded-2xl overflow-hidden" style={{ background: N.bg, boxShadow: N.raised }}>
              <div className="p-4 border-b" style={{ borderColor: N.border }}>
                <h3 style={{ color: N.text, fontSize: 14, fontWeight: 900, margin: 0 }}>Recent Queue Webhook Ticks ({systemData.events.length})</h3>
              </div>
              {systemData.events.length === 0 ? (
                <p className="p-4 text-xs font-semibold" style={{ color: N.muted, margin: 0 }}>No queue events logged</p>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ color: N.muted, borderBottom: `1px solid ${N.border}`, fontWeight: 800 }}>
                        {["Campaign", "Batch size", "Panel", "Scheduled", "Status", "Diagnostics"].map((h) => (
                          <th key={h} className="px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {systemData.events.map((e) => {
                        const statusColors: Record<string, string> = { DONE: "text-emerald-600", FAILED: "text-red-600", SCHEDULED: "text-gray-500", EXECUTING: "text-amber-600", RETRYING: "text-indigo-600" };
                        return (
                          <tr key={e.id} className="border-b" style={{ borderColor: N.border }}>
                            <td className="px-4 py-2.5">
                              <p className="font-bold truncate max-w-xs" style={{ color: N.text, margin: 0 }}>{e.order?.user?.email}</p>
                              <p className="text-[10px] truncate max-w-xs mt-0.5" style={{ color: N.muted, margin: 0 }}>{e.order?.reel?.url}</p>
                            </td>
                            <td className="px-4 py-2.5 font-bold" style={{ color: N.text }}>{(e.viewsBatch ?? 0).toLocaleString()} views</td>
                            <td className="px-4 py-2.5 font-semibold" style={{ color: N.muted }}>{e.panel?.name}</td>
                            <td className="px-4 py-2.5" style={{ color: N.muted }}>{new Date(e.scheduledAt).toLocaleTimeString()}</td>
                            <td className="px-4 py-2.5">
                              <span className={`font-bold ${statusColors[e.status] ?? "text-gray-500"}`}>{e.status}</span>
                            </td>
                            <td className="px-4 py-2.5 max-w-xs truncate font-bold text-red-600" title={e.errorMessage ?? ""}>
                              {e.errorMessage ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
