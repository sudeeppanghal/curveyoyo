"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

const PLAN_COLORS: Record<string, string> = {
  FREE: "#6b7280", TRIAL: "#818cf8", LIFETIME: "#34d399",
  SUSPENDED: "#f87171",
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0B0F" }}>
      <div className="w-full max-w-sm rounded-2xl border p-8 space-y-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-[#0B0B0F]" style={{ background: "#F59E0B" }}>Y</div>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Enter admin secret to continue</p>
        </div>
        <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadAll()}
          placeholder="Admin secret key…"
          className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/40"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={loadAll} className="w-full py-3 rounded-xl font-bold text-[#0B0B0F] hover:opacity-90 transition" style={{ background: "#F59E0B" }}>
          Enter Admin Panel →
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#0B0B0F" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[#0B0B0F]" style={{ background: "#F59E0B" }}>Y</div>
            <div>
              <h1 className="text-xl font-bold text-white">YoyoSMM Admin</h1>
              <p className="text-gray-500 text-xs">Manage your platform</p>
            </div>
          </div>
          <div className="flex gap-2">
            {saved && <span className="px-3 py-1.5 rounded-lg text-xs text-emerald-400 font-semibold" style={{ background: "rgba(52,211,153,0.1)" }}>✓ {saved}</span>}
            <button onClick={() => router.push("/dashboard")} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 border hover:bg-white/5 transition" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
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
            <div key={String(label)} className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xl font-bold text-white">{val}</p>
              <p className="text-xs text-gray-500">{label}</p>
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
                className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
                style={tab === t ? { background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" } : { color: "#6b7280", border: "1px solid rgba(255,255,255,0.06)", background: "transparent" }}>
                {iconMap[t]}{t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            );
          })}
        </div>

        {/* ── SETTINGS TAB ─── */}
        {tab === "settings" && (
          <div className="space-y-5">
            <div className="rounded-2xl border p-6" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <h2 className="text-lg font-bold text-white mb-5">💳 Crypto Wallet Addresses</h2>
              <div className="space-y-4">
                {[
                  { key: "trc20Address", label: "🔷 USDT TRC20 Address (TRON)", placeholder: "T..." },
                  { key: "bep20Address", label: "🔶 USDT BEP20 Address (BSC)", placeholder: "0x..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
                    <input value={(settings as unknown as Record<string, string>)[key] ?? ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white font-mono outline-none focus:ring-2 focus:ring-amber-500/40"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                ))}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">💵 Price (USDT)</label>
                    <input type="number" value={settings.priceUsdt} onChange={(e) => setSettings((p) => ({ ...p, priceUsdt: parseFloat(e.target.value) }))}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">⏱ Free Trial Hours</label>
                    <input type="number" value={settings.freeTrialHours} onChange={(e) => setSettings((p) => ({ ...p, freeTrialHours: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">📧 Support Email</label>
                  <input value={settings.supportEmail ?? ""} onChange={(e) => setSettings((p) => ({ ...p, supportEmail: e.target.value }))}
                    placeholder="support@yoyosmm.online"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <input type="checkbox" id="maintenance" checked={settings.maintenanceMode}
                    onChange={(e) => setSettings((p) => ({ ...p, maintenanceMode: e.target.checked }))}
                    className="w-4 h-4 accent-amber-400" />
                  <label htmlFor="maintenance" className="text-sm text-gray-300">🔧 Maintenance Mode (shows maintenance page to users)</label>
                </div>
              </div>
              <button onClick={saveSettings} className="mt-5 px-6 py-3 rounded-xl font-bold text-[#0B0B0F] hover:opacity-90 transition" style={{ background: "#F59E0B" }}>
                Save Settings ✓
              </button>
            </div>
          </div>
        )}

        {/* ── USERS TAB ─── */}
        {tab === "users" && (
          <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h2 className="font-bold text-white">All Users ({users.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    {["Email", "Plan", "Orders", "Panels", "Joined", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{u.email}</p>
                        {u.name && <p className="text-gray-500 text-xs">{u.name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ color: PLAN_COLORS[u.plan] ?? "#6b7280", background: `${PLAN_COLORS[u.plan] ?? "#6b7280"}1a` }}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u._count.orders}</td>
                      <td className="px-4 py-3 text-gray-400">{u._count.panels}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {u.plan !== "LIFETIME" && (
                            <button onClick={() => userAction(u.id, "upgrade")} className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-400/10 transition" style={{ border: "1px solid rgba(52,211,153,0.3)" }}>
                              Upgrade
                            </button>
                          )}
                          <button onClick={() => userAction(u.id, u.plan === "SUSPENDED" ? "unsuspend" : "suspend")}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:bg-red-400/10 transition"
                            style={{ border: "1px solid rgba(248,113,113,0.3)" }}>
                            {u.plan === "SUSPENDED" ? "Unsuspend" : "Suspend"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAYMENTS TAB ─── */}
        {tab === "payments" && (
          <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h2 className="font-bold text-white">Crypto Payments ({payments.length})</h2>
            </div>
            {payments.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">No payments yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      {["User", "Network", "TXID", "Amount", "Status", "Date"].map((h) => (
                        <th key={h} className="px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const statusColors: Record<string, string> = { CONFIRMED: "#34d399", PENDING: "#F59E0B", FAILED: "#f87171", VERIFYING: "#818cf8" };
                      return (
                        <tr key={p.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <td className="px-4 py-3">
                            <p className="text-white">{p.user?.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: p.network === "TRC20" ? "rgba(99,102,241,0.15)" : "rgba(245,158,11,0.15)", color: p.network === "TRC20" ? "#818cf8" : "#F59E0B" }}>
                              {p.network}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-amber-400 text-xs">{p.txHash.slice(0, 16)}…</code>
                          </td>
                          <td className="px-4 py-3 text-white">{p.amountUsdt ? `$${p.amountUsdt}` : "—"}</td>
                          <td className="px-4 py-3">
                            <span style={{ color: statusColors[p.status] ?? "#6b7280" }} className="text-xs font-semibold">{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
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
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm text-white bg-neutral-900 border outline-none"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
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

            <div className="rounded-2xl border overflow-hidden animate-fade-in" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      {["User & Reel", "Speed & Curve", "Delivery Targets", "Status", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 font-medium">{h}</th>
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
                        const statusColors: Record<string, string> = {
                          COMPLETED: "#34d399", DELIVERING: "#818cf8", PAUSED: "#F59E0B",
                          CANCELLED: "#ef4444", FAILED: "#ef4444", QUEUED: "#6b7280"
                        };
                        return (
                          <tr key={o.id} className="border-b hover:bg-white/[0.01]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                            <td className="px-4 py-3 max-w-[240px]">
                              <p className="text-white font-medium truncate" title={o.user.email}>{o.user.email}</p>
                              <a href={o.reel.url} target="_blank" rel="noopener noreferrer" className="text-amber-400 text-xs hover:underline truncate block max-w-xs mt-0.5">
                                {o.reel.platform === "INSTAGRAM" ? "📷" : o.reel.platform === "TIKTOK" ? "🎵" : "▶️"} {o.reel.url}
                              </a>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                                {o.curveStyle}
                              </span>
                              <p className="text-gray-500 text-xs mt-1">{o.durationHours}h duration</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-0.5 text-xs">
                                <p className="text-gray-300">👁 Views: <strong>{(o.viewsDelivered ?? 0).toLocaleString()}</strong> / {(o.viewsTarget ?? 0).toLocaleString()}</p>
                                {o.engagementEnabled && (
                                  <>
                                    {o.likesTarget > 0 && <p className="text-gray-400">👍 Likes: <strong>{o.likesDelivered ?? 0}</strong>/{o.likesTarget}</p>}
                                    {o.savesTarget > 0 && <p className="text-gray-400">🔖 Saves: <strong>{o.savesDelivered ?? 0}</strong>/{o.savesTarget}</p>}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span style={{ color: statusColors[o.status] ?? "#6b7280", background: `${statusColors[o.status] ?? "#6b7280"}15` }} className="text-xs px-2 py-0.5 rounded-full font-bold">
                                {o.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {o.status === "DELIVERING" && (
                                  <button onClick={() => handleCampaignAction(o.id, "pause")} className="px-2 py-1 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition">
                                    Pause
                                  </button>
                                )}
                                {o.status === "PAUSED" && (
                                  <button onClick={() => handleCampaignAction(o.id, "resume")} className="px-2 py-1 rounded text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition">
                                    Resume
                                  </button>
                                )}
                                {["DELIVERING", "PAUSED", "QUEUED"].includes(o.status) && (
                                  <button onClick={() => handleCampaignAction(o.id, "cancel")} className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition">
                                    Cancel
                                  </button>
                                )}
                                {["DELIVERING", "COMPLETED"].includes(o.status) && (
                                  <button onClick={() => handleCampaignAction(o.id, "refill")} className="px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition" title="Query status & place refill if partial">
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
              <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Active Campaigns</p>
                <p className="text-2xl font-bold text-indigo-400 mt-1">
                  {orders.filter((o) => ["DELIVERING", "QUEUED"].includes(o.status)).length}
                </p>
              </div>
              <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Completed Campaigns</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {orders.filter((o) => o.status === "COMPLETED").length}
                </p>
              </div>
              <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Scheduled Ticks</p>
                <p className="text-2xl font-bold text-gray-400 mt-1">
                  {systemData.eventStats.find((s) => s.status === "SCHEDULED")?.count ?? 0}
                </p>
              </div>
              <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Failed Ticks</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {systemData.eventStats.find((s) => s.status === "FAILED")?.count ?? 0}
                </p>
              </div>
            </div>

            {/* Panels Diagnostics */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <h3 className="font-bold text-white">Global User Panel Connections ({systemData.panels.length})</h3>
              </div>
              {systemData.panels.length === 0 ? (
                <p className="p-4 text-xs text-gray-500">No panel APIs connected yet</p>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-500 uppercase border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        {["User", "Panel Name", "API URL", "Status", "Latency", "Success %"].map((h) => (
                          <th key={h} className="px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {systemData.panels.map((p) => {
                        const colors: Record<string, string> = { ONLINE: "text-emerald-400", OFFLINE: "text-red-400", SLOW: "text-amber-400", UNKNOWN: "text-gray-400" };
                        return (
                          <tr key={p.id} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                            <td className="px-4 py-2.5 text-gray-400">{p.user?.email}</td>
                            <td className="px-4 py-2.5 text-white font-medium">{p.name}</td>
                            <td className="px-4 py-2.5 text-gray-500 truncate max-w-xs">{p.apiUrl}</td>
                            <td className="px-4 py-2.5">
                              <span className={`font-semibold ${colors[p.status] ?? "text-gray-400"}`}>{p.status}</span>
                            </td>
                            <td className="px-4 py-2.5 text-white">{p.lastResponseMs ? `${p.lastResponseMs}ms` : "—"}</td>
                            <td className="px-4 py-2.5 text-white font-medium">{p.successRate.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Queue Events Ticks */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <h3 className="font-bold text-white">Recent Queue Webhook Ticks ({systemData.events.length})</h3>
              </div>
              {systemData.events.length === 0 ? (
                <p className="p-4 text-xs text-gray-500">No queue events logged</p>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-500 uppercase border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        {["Campaign", "Batch size", "Panel", "Scheduled", "Status", "Diagnostics"].map((h) => (
                          <th key={h} className="px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {systemData.events.map((e) => {
                        const statusColors: Record<string, string> = { DONE: "text-emerald-400", FAILED: "text-red-400", SCHEDULED: "text-gray-400", EXECUTING: "text-amber-400", RETRYING: "text-indigo-400" };
                        return (
                          <tr key={e.id} className="border-b hover:bg-white/[0.01]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                            <td className="px-4 py-2.5">
                              <p className="text-white font-medium truncate max-w-xs">{e.order?.user?.email}</p>
                              <p className="text-gray-500 text-[10px] mt-0.5 truncate max-w-xs">{e.order?.reel?.url}</p>
                            </td>
                            <td className="px-4 py-2.5 text-white font-semibold">{(e.viewsBatch ?? 0).toLocaleString()} views</td>
                            <td className="px-4 py-2.5 text-gray-400">{e.panel?.name}</td>
                            <td className="px-4 py-2.5 text-gray-500">{new Date(e.scheduledAt).toLocaleTimeString()}</td>
                            <td className="px-4 py-2.5">
                              <span className={`font-semibold ${statusColors[e.status] ?? "text-gray-400"}`}>{e.status}</span>
                            </td>
                            <td className="px-4 py-2.5 max-w-xs truncate text-red-400" title={e.errorMessage ?? ""}>
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
