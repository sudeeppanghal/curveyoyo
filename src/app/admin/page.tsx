"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminSettings {
  trc20Address: string | null;
  bep20Address: string | null;
  priceUsdt: number;
  siteName: string;
  freeTrialHours: number;
  maintenanceMode: boolean;
  supportEmail: string | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  createdAt: string;
  lifetimeUnlocked: boolean;
  _count: { orders: number; panels: number };
  subscription: { status: string; paidAt: string } | null;
}

interface Payment {
  id: string;
  txHash: string;
  network: string;
  status: string;
  amountUsdt: number | null;
  createdAt: string;
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
  FREE: "#718096",
  TRIAL: "#4f46e5",
  LIFETIME: "#16a34a",
  SUSPENDED: "#dc2626",
};

export default function AdminPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<AdminTab>("settings");
  const [settings, setSettings] = useState<AdminSettings>({
    trc20Address: "",
    bep20Address: "",
    priceUsdt: 20,
    siteName: "YoyoSMM",
    freeTrialHours: 24,
    maintenanceMode: false,
    supportEmail: "",
  });
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
    if (res.ok) {
      setSaved("Saved!");
      setTimeout(() => setSaved(""), 2000);
    } else {
      setError("Save failed");
    }
  };

  const userAction = async (userId: string, action: "upgrade" | "suspend" | "unsuspend") => {
    await fetch("/api/admin/users", { method: "PATCH", headers, body: JSON.stringify({ userId, action }) });
    loadAll();
  };

  const impersonateUser = async (userId: string) => {
    setSaved("Authenticating as user…");
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers,
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok && data.redirectTo) {
        setSaved("Redirecting…");
        window.location.href = data.redirectTo;
      } else {
        setError(data.error ?? "Failed to impersonate");
        setTimeout(() => setError(""), 3000);
      }
    } catch (e) {
      setError(String(e));
      setTimeout(() => setError(""), 3000);
    }
  };

  // Auth Screen REDESIGNED
  if (!authed) return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: N.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "16px",
    }}>
      <style>{`
        .neo-input:focus {
          box-shadow: inset 6px 6px 12px #c8d0e7, inset -6px -6px 12px #ffffff, 0 0 0 2px rgba(217, 119, 6, 0.25) !important;
        }
        .neo-btn:hover {
          transform: translateY(-1px);
          box-shadow: 8px 8px 22px #c8d0e7, -8px -8px 22px #ffffff !important;
        }
        .neo-btn:active {
          transform: none;
          box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important;
        }
      `}</style>
      <div style={{
        width: "100%",
        maxWidth: 380,
        borderRadius: 24,
        padding: 36,
        background: N.bg,
        boxShadow: N.raised,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        textAlign: "center"
      }}>
        <div>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 22,
            fontWeight: 900,
            color: "#ffffff",
            background: N.accentBg,
            boxShadow: N.raisedSm,
          }}>Y</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>Admin Panel</h1>
          <p style={{ color: N.muted, fontSize: 13, fontWeight: 600, marginTop: 6, margin: 0 }}>Enter admin secret key to continue</p>
        </div>
        <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadAll()}
          placeholder="Admin secret key…"
          className="neo-input"
          style={{
            width: "100%",
            padding: "14px 18px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            color: N.text,
            background: N.bg,
            border: "none",
            boxShadow: N.inset,
            outline: "none",
            boxSizing: "border-box"
          }} />
        {error && <p style={{ color: "#dc2626", fontSize: 12, fontWeight: 700, margin: 0 }}>⚠️ {error}</p>}
        <button onClick={loadAll} className="neo-btn"
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 850,
            border: "none",
            color: "#ffffff",
            background: N.accentBg,
            boxShadow: N.raisedSm,
            cursor: "pointer",
          }}>
          {loading ? "Verifying..." : "Enter Admin Panel →"}
        </button>
      </div>
    </div>
  );

  // Main Dashboard REDESIGNED
  return (
    <div style={{
      minHeight: "100vh",
      background: N.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "40px 16px",
      boxSizing: "border-box"
    }}>
      <style>{`
        .neo-input:focus {
          box-shadow: inset 6px 6px 12px #c8d0e7, inset -6px -6px 12px #ffffff, 0 0 0 2px rgba(217, 119, 6, 0.25) !important;
        }
        .neo-btn:hover {
          transform: translateY(-1px);
          box-shadow: 8px 8px 22px #c8d0e7, -8px -8px 22px #ffffff !important;
        }
        .neo-btn:active {
          transform: none;
          box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important;
        }
        .hover-row:hover {
          background: rgba(200, 208, 231, 0.15) !important;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 900,
              color: "#ffffff",
              background: N.accentBg,
              boxShadow: N.raisedSm,
            }}>Y</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>YoyoSMM Admin</h1>
              <p style={{ color: N.muted, fontSize: 13, fontWeight: 600, margin: 0, marginTop: 2 }}>Manage platform configurations and global statistics</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saved && (
              <span style={{
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 12,
                color: "#16a34a",
                fontWeight: 800,
                background: "rgba(22, 163, 74, 0.08)",
                boxShadow: N.inset,
              }}>✓ {saved}</span>
            )}
            <button onClick={() => router.push("/dashboard")} className="neo-btn"
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 850,
                border: "none",
                background: N.bg,
                color: N.muted,
                boxShadow: N.raisedSm,
                cursor: "pointer",
              }}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
          {[
            ["👥", "Total Users", users.length],
            ["💎", "Lifetime Users", users.filter((u) => u.plan === "LIFETIME").length],
            ["🔄", "Free Trial Users", users.filter((u) => u.plan === "FREE" || u.plan === "TRIAL").length],
            ["💰", "Platform Revenue", `$${payments.filter((p) => p.status === "CONFIRMED").reduce((a, p) => a + (p.amountUsdt ?? 0), 0).toFixed(0)} USDT`],
          ].map(([icon, label, val]) => (
            <div key={label} style={{
              borderRadius: 20,
              padding: "24px 20px",
              background: N.bg,
              boxShadow: N.raised,
              display: "flex",
              alignItems: "center",
              gap: 16
            }}>
              <div style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: N.bg,
                boxShadow: N.inset,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22
              }}>{icon}</div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 900, color: N.text, margin: 0 }}>{val}</p>
                <p style={{ color: N.muted, fontSize: 11, fontWeight: 700, margin: 0, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab switch bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, borderBottom: `1px solid ${N.border}`, paddingBottom: 16 }}>
          {(["settings", "users", "payments", "campaigns", "system"] as AdminTab[]).map((t) => {
            const iconMap: Record<AdminTab, string> = {
              settings: "⚙️ ",
              users: "👥 ",
              payments: "💰 ",
              campaigns: "📦 ",
              system: "⚡ "
            };
            return (
              <button key={t} onClick={() => setTab(t)} className="neo-btn"
                style={{
                  padding: "10px 20px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: N.bg,
                  color: tab === t ? N.accent : N.muted,
                  boxShadow: tab === t ? N.inset : N.raisedSm,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                <span>{iconMap[t]}</span>
                <span style={{ textTransform: "capitalize" }}>{t}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents wrapper */}
        <div style={{ borderRadius: 24, padding: 32, background: N.bg, boxShadow: N.raised, minHeight: 280, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── SETTINGS TAB ─── */}
          {tab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 6px" }}>💳 Crypto Wallet Addresses</h2>
                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Addresses where lifetime upgrade deposits are routed</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  { key: "trc20Address", label: "USDT TRC20 Address (TRON Network)", placeholder: "T..." },
                  { key: "bep20Address", label: "USDT BEP20 Address (BSC Network)", placeholder: "0x..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>{label}</label>
                    <input value={(settings as unknown as Record<string, string>)[key] ?? ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="neo-input"
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "monospace",
                        color: N.text,
                        background: N.bg,
                        border: "none",
                        boxShadow: N.inset,
                        outline: "none",
                        boxSizing: "border-box"
                      }} />
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>💵 Price (USDT)</label>
                    <input type="number" value={settings.priceUsdt} onChange={(e) => setSettings((p) => ({ ...p, priceUsdt: parseFloat(e.target.value) }))}
                      className="neo-input"
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 600,
                        color: N.text,
                        background: N.bg,
                        border: "none",
                        boxShadow: N.inset,
                        outline: "none",
                        boxSizing: "border-box"
                      }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>⏱ Free Trial Hours</label>
                    <input type="number" value={settings.freeTrialHours} onChange={(e) => setSettings((p) => ({ ...p, freeTrialHours: parseInt(e.target.value) }))}
                      className="neo-input"
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 600,
                        color: N.text,
                        background: N.bg,
                        border: "none",
                        boxShadow: N.inset,
                        outline: "none",
                        boxSizing: "border-box"
                      }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>📧 Support Email</label>
                  <input value={settings.supportEmail ?? ""} onChange={(e) => setSettings((p) => ({ ...p, supportEmail: e.target.value }))}
                    placeholder="support@yoyosmm.online"
                    className="neo-input"
                    style={{
                      width: "100%",
                      padding: "14px 18px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      color: N.text,
                      background: N.bg,
                      border: "none",
                      boxShadow: N.inset,
                      outline: "none",
                      boxSizing: "border-box"
                    }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 18, borderRadius: 12, background: N.bg, boxShadow: N.inset }}>
                  <input type="checkbox" id="maintenance" checked={settings.maintenanceMode}
                    onChange={(e) => setSettings((p) => ({ ...p, maintenanceMode: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: N.accent, cursor: "pointer" }} />
                  <label htmlFor="maintenance" style={{ fontSize: 13, color: N.text, fontWeight: 700, cursor: "pointer" }}>🔧 Maintenance Mode (shows maintenance page to users)</label>
                </div>
              </div>
              <button onClick={saveSettings} className="neo-btn"
                style={{
                  alignSelf: "flex-start",
                  padding: "12px 28px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 850,
                  border: "none",
                  color: "#ffffff",
                  background: N.accentBg,
                  boxShadow: N.raisedSm,
                  cursor: "pointer"
                }}>
                Save Settings
              </button>
            </div>
          )}

          {/* ── USERS TAB ─── */}
          {tab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>Platform Registered Users</h2>
                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Active registered operators and accounts: {users.length}</p>
              </div>
              {users.length === 0 ? (
                <div style={{ padding: "48px 0", textAlign: "center", color: N.muted, fontSize: 13, fontWeight: 700 }}>No users found</div>
              ) : (
                <div style={{ overflowX: "auto", margin: "0 -32px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>
                        {["Email", "Created At", "Plan Status", "Connected Panels", "Campaigns Count", "Actions"].map((h) => (
                          <th key={h} style={{ padding: "12px 24px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>
                          <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 700, color: N.text }}>{u.email}</td>
                          <td style={{ padding: "14px 24px", fontSize: 13, color: N.muted, fontWeight: 600 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: "14px 24px" }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 850,
                              padding: "4px 8px",
                              borderRadius: 6,
                              background: PLAN_COLORS[u.plan] + "1A",
                              color: PLAN_COLORS[u.plan]
                            }}>{u.plan}</span>
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 700, color: N.text }}>{u._count?.panels ?? 0} connected</td>
                          <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 700, color: N.text }}>{u._count?.orders ?? 0} campaigns</td>
                          <td style={{ padding: "14px 24px" }}>
                            <div style={{ display: "flex", gap: 10 }}>
                              {u.plan !== "LIFETIME" && (
                                <button onClick={() => userAction(u.id, "upgrade")} className="neo-btn"
                                  style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#16a34a", boxShadow: N.raisedSm }}>
                                  Upgrade Lifetime
                                </button>
                              )}
                              {u.plan !== "SUSPENDED" ? (
                                <button onClick={() => userAction(u.id, "suspend")} className="neo-btn"
                                  style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#dc2626", boxShadow: N.raisedSm }}>
                                  Suspend
                                </button>
                              ) : (
                                <button onClick={() => userAction(u.id, "unsuspend")} className="neo-btn"
                                  style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: N.accent, boxShadow: N.raisedSm }}>
                                  Unsuspend
                                </button>
                              )}
                              <button onClick={() => impersonateUser(u.id)} className="neo-btn"
                                style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#2563eb", boxShadow: N.raisedSm }}>
                                Login As
                              </button>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>Crypto Payments Log</h2>
                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Lifetime subscription deposits on USDT-TRC20 & BEP20 networks</p>
              </div>
              {payments.length === 0 ? (
                <div style={{ padding: "48px 0", textAlign: "center", color: N.muted, fontSize: 13, fontWeight: 700 }}>No payments found</div>
              ) : (
                <div style={{ overflowX: "auto", margin: "0 -32px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>
                        {["User", "Network", "Transaction Hash / TXID", "Amount", "Status", "Date"].map((h) => (
                          <th key={h} style={{ padding: "12px 24px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const statusColors: Record<string, string> = { CONFIRMED: "#16a34a", PENDING: "#d97706", FAILED: "#dc2626", VERIFYING: "#2563eb" };
                        return (
                          <tr key={p.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>
                            <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 700, color: N.text }}>{p.user?.email}</td>
                            <td style={{ padding: "14px 24px" }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "4px 8px",
                                borderRadius: 6,
                                background: p.network === "TRC20" ? "rgba(37,99,235,0.08)" : "rgba(217,119,6,0.08)",
                                color: p.network === "TRC20" ? "#2563eb" : "#d97706"
                              }}>{p.network}</span>
                            </td>
                            <td style={{ padding: "14px 24px" }}>
                              <code style={{ fontSize: 12, fontWeight: 700, color: N.accent }}>{p.txHash.slice(0, 20)}…</code>
                            </td>
                            <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 900, color: N.text }}>{p.amountUsdt ? `$${p.amountUsdt} USDT` : "—"}</td>
                            <td style={{ padding: "14px 24px" }}>
                              <strong style={{ fontSize: 12, color: statusColors[p.status] ?? N.muted }}>{p.status}</strong>
                            </td>
                            <td style={{ padding: "14px 24px", fontSize: 12, color: N.muted, fontWeight: 600 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>Global SMM Campaigns Override</h2>
                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Monitor and force actions on active or queued pacing schedules</p>
              </div>

              {/* Filters */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <input type="text" placeholder="Search by user email, reel URL, or order ID…" value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)}
                  className="neo-input"
                  style={{
                    flex: 1,
                    minWidth: 280,
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: N.text,
                    background: N.bg,
                    border: "none",
                    boxShadow: N.inset,
                    outline: "none"
                  }} />
                <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 800,
                    background: N.bg,
                    color: N.text,
                    border: "none",
                    boxShadow: N.raisedSm,
                    cursor: "pointer",
                    outline: "none"
                  }}>
                  <option value="All">All Statuses</option>
                  <option value="DELIVERING">Delivering</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="FAILED">Failed</option>
                  <option value="QUEUED">Queued</option>
                </select>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto", margin: "0 -32px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>
                      {["User & Target Reel", "Speed & Curve", "Targets Overview", "Status", "Manual Overrides"].map((h) => (
                        <th key={h} style={{ padding: "12px 24px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>
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
                          <tr key={o.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>
                            <td style={{ padding: "14px 24px" }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: N.text, margin: 0 }}>{o.user?.email}</p>
                              <a href={o.reel?.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: N.accent, fontWeight: 700, textDecoration: "none" }}>
                                {o.reel?.url?.length > 42 ? `${o.reel.url.slice(0, 42)}…` : o.reel?.url}
                              </a>
                            </td>
                            <td style={{ padding: "14px 24px" }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "4px 8px",
                                borderRadius: 6,
                                background: "rgba(217,119,6,0.08)",
                                color: N.accent
                              }}>{o.curveStyle}</span>
                              <p style={{ color: N.muted, fontSize: 11, margin: "4px 0 0", fontWeight: 600 }}>{o.durationHours}h schedule</p>
                            </td>
                            <td style={{ padding: "14px 24px" }}>
                              <p style={{ color: N.text, margin: 0, fontWeight: 700, fontSize: 13 }}>👁 {o.viewsTarget.toLocaleString()} views</p>
                              <p style={{ color: N.muted, fontSize: 11, margin: "4px 0 0", fontWeight: 600 }}>
                                {o.likesTarget > 0 && `👍 ${o.likesTarget.toLocaleString()} `}
                                {o.savesTarget > 0 && `🔖 ${o.savesTarget.toLocaleString()} `}
                                {o.commentsTarget > 0 && `💬 ${o.commentsTarget.toLocaleString()}`}
                              </p>
                            </td>
                            <td style={{ padding: "14px 24px" }}>
                              <strong style={{ fontSize: 12, color: statusColors[o.status] ?? N.muted }}>{o.status}</strong>
                            </td>
                            <td style={{ padding: "14px 24px" }}>
                              <div style={{ display: "flex", gap: 8 }}>
                                {o.status === "DELIVERING" && (
                                  <button onClick={() => handleCampaignAction(o.id, "pause")} className="neo-btn"
                                    style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: N.accent, boxShadow: N.raisedSm }}>
                                    Pause
                                  </button>
                                )}
                                {o.status === "PAUSED" && (
                                  <button onClick={() => handleCampaignAction(o.id, "resume")} className="neo-btn"
                                    style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#16a34a", boxShadow: N.raisedSm }}>
                                    Resume
                                  </button>
                                )}
                                {["DELIVERING", "PAUSED", "QUEUED"].includes(o.status) && (
                                  <button onClick={() => handleCampaignAction(o.id, "cancel")} className="neo-btn"
                                    style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#dc2626", boxShadow: N.raisedSm }}>
                                    Cancel
                                  </button>
                                )}
                                {["DELIVERING", "COMPLETED"].includes(o.status) && (
                                  <button onClick={() => handleCampaignAction(o.id, "refill")} className="neo-btn"
                                    style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#16a34a", boxShadow: N.raisedSm }}
                                    title="Query status & place refill if partial">
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
          )}

          {/* ── SYSTEM HEALTH TAB ─── */}
          {tab === "system" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>System Diagnostic Logs</h2>
                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Real-time execution tick states and user panel statuses</p>
              </div>

              {/* Status counts grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
                {[
                  ["Active Campaigns", orders.filter((o) => ["DELIVERING", "QUEUED"].includes(o.status)).length, N.accent],
                  ["Completed Campaigns", orders.filter((o) => o.status === "COMPLETED").length, "#16a34a"],
                  ["Scheduled Ticks", systemData.eventStats.find((s) => s.status === "SCHEDULED")?.count ?? 0, N.text],
                  ["Failed Ticks", systemData.eventStats.find((s) => s.status === "FAILED")?.count ?? 0, "#dc2626"],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ padding: 18, borderRadius: 14, background: N.bg, boxShadow: N.raisedSm }}>
                    <p style={{ color: N.muted, fontSize: 11, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: color as string, margin: 0, marginTop: 4 }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Panels Diagnostics */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ color: N.text, fontSize: 14, fontWeight: 900, margin: 0 }}>Global User SMM Panels ({systemData.panels.length})</h3>
                {systemData.panels.length === 0 ? (
                  <div style={{ padding: 16, background: N.bg, borderRadius: 12, boxShadow: N.inset, fontSize: 12, color: N.muted, fontWeight: 600 }}>No panel APIs connected yet</div>
                ) : (
                  <div style={{ overflowX: "auto", margin: "0 -32px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${N.border}`, color: N.muted }}>
                          {["User", "Panel Name", "API URL", "Status", "Latency", "Success Rate"].map((h) => (
                            <th key={h} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {systemData.panels.map((p) => {
                          const statusColor = p.status === "ONLINE" ? "#16a34a" : p.status === "OFFLINE" ? "#dc2626" : p.status === "SLOW" ? "#d97706" : N.muted;
                          return (
                            <tr key={p.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>
                              <td style={{ padding: "12px 24px", fontSize: 13, color: N.muted, fontWeight: 600 }}>{p.user?.email}</td>
                              <td style={{ padding: "12px 24px", fontSize: 13, fontWeight: 700, color: N.text }}>{p.name}</td>
                              <td style={{ padding: "12px 24px", fontSize: 12, color: N.muted, fontFamily: "monospace" }}>{p.apiUrl}</td>
                              <td style={{ padding: "12px 24px" }}>
                                <strong style={{ fontSize: 12, color: statusColor }}>{p.status}</strong>
                              </td>
                              <td style={{ padding: "12px 24px", fontSize: 13, fontWeight: 700, color: N.text }}>{p.lastResponseMs ? `${p.lastResponseMs}ms` : "—"}</td>
                              <td style={{ padding: "12px 24px", fontSize: 13, fontWeight: 700, color: N.text }}>{p.successRate.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Queue Events Ticks */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ color: N.text, fontSize: 14, fontWeight: 900, margin: 0 }}>Recent Webhook ticks log ({systemData.events.length})</h3>
                {systemData.events.length === 0 ? (
                  <div style={{ padding: 16, background: N.bg, borderRadius: 12, boxShadow: N.inset, fontSize: 12, color: N.muted, fontWeight: 600 }}>No queue events logged</div>
                ) : (
                  <div style={{ overflowX: "auto", margin: "0 -32px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${N.border}`, color: N.muted }}>
                          {["Campaign User / Reel", "Batch Size", "Panel Provider", "Scheduled", "Status", "Diagnostics"].map((h) => (
                            <th key={h} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {systemData.events.map((e) => {
                          const statusColors: Record<string, string> = { DONE: "#16a34a", FAILED: "#dc2626", SCHEDULED: "#718096", EXECUTING: "#d97706", RETRYING: "#4f46e5" };
                          return (
                            <tr key={e.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>
                              <td style={{ padding: "12px 24px" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: N.text, margin: 0 }}>{e.order?.user?.email}</p>
                                <p style={{ fontSize: 11, color: N.muted, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{e.order?.reel?.url}</p>
                              </td>
                              <td style={{ padding: "12px 24px", fontSize: 13, fontWeight: 750, color: N.text }}>{(e.viewsBatch ?? 0).toLocaleString()} views</td>
                              <td style={{ padding: "12px 24px", fontSize: 13, color: N.muted, fontWeight: 600 }}>{e.panel?.name}</td>
                              <td style={{ padding: "12px 24px", fontSize: 12, color: N.muted, fontWeight: 600 }}>{new Date(e.scheduledAt).toLocaleTimeString()}</td>
                              <td style={{ padding: "12px 24px" }}>
                                <strong style={{ fontSize: 12, color: statusColors[e.status] ?? N.muted }}>{e.status}</strong>
                              </td>
                              <td style={{ padding: "12px 24px", fontSize: 12, color: "#dc2626", fontWeight: 700, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.errorMessage ?? ""}>
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
    </div>
  );
}
