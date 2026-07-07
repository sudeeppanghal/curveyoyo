/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { N } from "@/lib/theme";

interface MtpSettings {
  mtpMode: boolean;
  mtpApiKey: string;
  mtpLastSyncAt: string | null;
  mtpServiceCount: number | null;
}

interface MtpService {
  id: string;
  serviceId: string;
  name: string;
  category: string;
  type: string;
  rate: number;
  customRate: number;
  minOrder: number;
  maxOrder: number;
  isActive: boolean;
}

interface MtpTabProps {
  secret: string;
}

export function MtpTab({ secret }: MtpTabProps) {
  const [settings, setSettings] = useState<MtpSettings>({
    mtpMode: false,
    mtpApiKey: "",
    mtpLastSyncAt: null,
    mtpServiceCount: null,
  });
  const [services, setServices] = useState<MtpService[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // Load current settings
  useEffect(() => {
    fetch("/api/admin/settings", { headers: { "x-admin-secret": secret } })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings({
            mtpMode: d.settings.mtpMode ?? false,
            mtpApiKey: d.settings.mtpApiKey ?? "",
            mtpLastSyncAt: d.settings.mtpLastSyncAt ?? null,
            mtpServiceCount: d.settings.mtpServiceCount ?? null,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [secret]);

  const loadServices = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);
    fetch(`/api/mtp/services?${params}`, { headers: { "x-admin-secret": secret } })
      .then((r) => r.json())
      .then((d) => {
        setServices(d.services ?? []);
        setTotal(d.total ?? 0);
        setPages(d.pages ?? 1);
        if (d.categories?.length) setCategories(d.categories);
      })
      .catch(() => {});
  }, [secret, page, search, categoryFilter]);

  useEffect(() => {
    if (!loading) loadServices();
  }, [loading, loadServices]);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(""), 4000);
  }

  async function saveApiKey() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ mtpApiKey: settings.mtpApiKey }),
    });
    setSaving(false);
    if (res.ok) flash("✅ API key saved successfully.");
    else flash("❌ Failed to save API key.");
  }

  async function checkBalance() {
    if (!settings.mtpApiKey) { flash("Enter and save an API key first."); return; }
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/mtp/sync", {
        method: "POST",
        headers: { "x-admin-secret": secret, "x-action": "balance" },
      });
      const d = await res.json();
      if (d.balance !== undefined) setBalance(d.balance);
      else flash("Could not fetch balance.");
    } catch { flash("Network error."); }
    setBalanceLoading(false);
  }

  async function syncServices() {
    setSyncing(true);
    const res = await fetch("/api/mtp/sync", {
      method: "POST",
      headers: { "x-admin-secret": secret },
    });
    const d = await res.json();
    setSyncing(false);
    if (d.ok) {
      flash(`✅ Synced ${d.synced.toLocaleString()} services successfully!`);
      setSettings((prev) => ({
        ...prev,
        mtpServiceCount: d.synced,
        mtpLastSyncAt: new Date().toISOString(),
      }));
      loadServices();
    } else {
      flash(`❌ Sync failed: ${d.error}`);
    }
  }

  async function toggleMode() {
    const newMode = !settings.mtpMode;
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ mtpMode: newMode }),
    });
    setSaving(false);
    setConfirmToggle(false);
    if (res.ok) {
      setSettings((prev) => ({ ...prev, mtpMode: newMode }));
      flash(newMode
        ? "✅ SMM Provider Mode is now ACTIVE — user dashboard has switched."
        : "✅ SMM Provider Mode DEACTIVATED — original dashboard restored."
      );
    } else {
      flash("❌ Failed to toggle mode.");
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: N.muted, fontSize: 14 }}>
        Loading SMM Provider settings…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0 }}>
            🔌 SMM Provider Integration
          </h2>
          <p style={{ fontSize: 13, color: N.muted, margin: "4px 0 0" }}>
            Connect an external SMM provider. Services are branded under YoyoSMM — no third-party names visible to users.
          </p>
        </div>
        {/* Status badge */}
        <div style={{
          padding: "8px 20px",
          borderRadius: 50,
          fontWeight: 900,
          fontSize: 13,
          letterSpacing: "0.05em",
          background: settings.mtpMode ? "rgba(22,163,74,0.12)" : "rgba(239,68,68,0.1)",
          color: settings.mtpMode ? "#16a34a" : "#dc2626",
          boxShadow: N.raisedSm,
        }}>
          {settings.mtpMode ? "⚡ MODE: ACTIVE" : "⭕ MODE: INACTIVE"}
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{
          padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: msg.startsWith("✅") ? "rgba(22,163,74,0.12)" : "rgba(239,68,68,0.1)",
          color: msg.startsWith("✅") ? "#16a34a" : "#dc2626",
          boxShadow: N.insetSm,
        }}>
          {msg}
        </div>
      )}

      {/* Section 1: API Key */}
      <div style={{ background: N.bg, borderRadius: 20, padding: 24, boxShadow: N.raised }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: N.text, margin: "0 0 16px" }}>🔑 API Key Configuration</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
            <input
              type={apiKeyVisible ? "text" : "password"}
              value={settings.mtpApiKey}
              onChange={(e) => setSettings((p) => ({ ...p, mtpApiKey: e.target.value }))}
              placeholder="Paste your provider API key here…"
              style={{
                width: "100%", padding: "12px 44px 12px 16px",
                borderRadius: 12, border: `1px solid ${N.border}`,
                background: N.bg, boxShadow: N.inset,
                fontSize: 13, color: N.text, fontFamily: "monospace",
                outline: "none", boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => setApiKeyVisible((v) => !v)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", fontSize: 16, color: N.muted,
              }}
              title={apiKeyVisible ? "Hide" : "Show"}
            >
              {apiKeyVisible ? "🙈" : "👁️"}
            </button>
          </div>
          <button
            onClick={saveApiKey}
            disabled={saving}
            style={{
              padding: "12px 24px", borderRadius: 12, border: "none", cursor: saving ? "not-allowed" : "pointer",
              background: N.accentBg, color: "#fff", fontWeight: 800, fontSize: 13,
              boxShadow: N.raisedSm, opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "💾 Save Key"}
          </button>
          <button
            onClick={checkBalance}
            disabled={balanceLoading}
            style={{
              padding: "12px 24px", borderRadius: 12, border: "none", cursor: "pointer",
              background: N.bg, color: N.text, fontWeight: 700, fontSize: 13,
              boxShadow: N.raisedSm,
            }}
          >
            {balanceLoading ? "Checking…" : "💰 Check Balance"}
          </button>
        </div>
        {balance !== null && (
          <p style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 700, color: "#16a34a" }}>
            Provider account balance: <strong>${balance.toFixed(4)} USD</strong>
          </p>
        )}
        <p style={{ margin: "10px 0 0", fontSize: 11, color: N.muted }}>
          API key is stored securely and never shown to users.
        </p>
      </div>

      {/* Section 2: Sync */}
      <div style={{ background: N.bg, borderRadius: 20, padding: 24, boxShadow: N.raised }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: N.text, margin: "0 0 8px" }}>🔄 Service Synchronization</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: N.text, fontWeight: 600 }}>
              {settings.mtpServiceCount !== null
                ? `${settings.mtpServiceCount.toLocaleString()} services synced`
                : "No sync performed yet"}
            </p>
            {settings.mtpLastSyncAt && (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: N.muted }}>
                Last sync: {new Date(settings.mtpLastSyncAt).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={syncServices}
            disabled={syncing || !settings.mtpApiKey}
            style={{
              padding: "12px 28px", borderRadius: 12, border: "none",
              cursor: syncing || !settings.mtpApiKey ? "not-allowed" : "pointer",
              background: syncing ? N.bg : N.accentBg,
              color: syncing ? N.muted : "#fff",
              fontWeight: 800, fontSize: 13, boxShadow: N.raisedSm,
              opacity: !settings.mtpApiKey ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {syncing ? "⏳ Syncing all services…" : "🔄 Sync Now"}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: N.muted }}>
          Pricing is auto-calculated at <strong>USD rate × 2.5 × 96 = INR per 1000 units</strong>.
          Example: $0.10/1000 → ₹24.00/1000
        </p>
      </div>

      {/* Section 3: Mode Toggle */}
      <div style={{
        background: N.bg, borderRadius: 20, padding: 24, boxShadow: N.raised,
        border: settings.mtpMode ? "2px solid rgba(22,163,74,0.3)" : "2px solid transparent",
        transition: "border 0.3s",
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: N.text, margin: "0 0 8px" }}>
          ⚡ Provider Mode Switch
        </h3>
        <p style={{ fontSize: 13, color: N.muted, margin: "0 0 20px" }}>
          {settings.mtpMode
            ? "Provider mode is ACTIVE. User dashboard shows this provider's services. Turn off to restore original dashboard."
            : "Provider mode is INACTIVE. Original dashboard and panels are shown to users. Switch to activate this provider's full catalog."}
        </p>

        {/* Big toggle button */}
        <button
          onClick={() => setConfirmToggle(true)}
          style={{
            padding: "16px 40px",
            borderRadius: 16,
            border: "none",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: "0.04em",
            background: settings.mtpMode
              ? "linear-gradient(135deg, #dc2626, #ef4444)"
              : "linear-gradient(135deg, #16a34a, #22c55e)",
            color: "#fff",
            boxShadow: settings.mtpMode
              ? "0 8px 24px rgba(220,38,38,0.35)"
              : "0 8px 24px rgba(22,163,74,0.35)",
            transition: "all 0.3s",
          }}
        >
          {settings.mtpMode ? "🔴 DEACTIVATE Provider Mode" : "🟢 ACTIVATE Provider Mode"}
        </button>

        <p style={{ margin: "12px 0 0", fontSize: 11, color: N.muted }}>
          ⚠️ Activation switches the user dashboard immediately. Ensure services are synced and API key is set before activating.
        </p>
      </div>

      {/* Section 4: Services Browser */}
      {(settings.mtpServiceCount ?? 0) > 0 && (
        <div style={{ background: N.bg, borderRadius: 20, padding: 24, boxShadow: N.raised }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: N.text, margin: "0 0 16px" }}>
            📋 Service Catalog Preview ({total.toLocaleString()} services)
          </h3>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="🔍 Search services…"
              style={{
                flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10,
                border: `1px solid ${N.border}`, background: N.bg, boxShadow: N.inset,
                fontSize: 13, color: N.text, outline: "none",
              }}
            />
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              style={{
                padding: "10px 14px", borderRadius: 10, border: `1px solid ${N.border}`,
                background: N.bg, boxShadow: N.inset, fontSize: 13, color: N.text,
                outline: "none", minWidth: 160,
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${N.border}` }}>
                  {["ID", "Service Name", "Category", "USD/1K", "Our INR/1K", "Min", "Max"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 800, color: N.muted, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <tr key={svc.id} style={{ borderBottom: `1px solid ${N.border}` }}>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: N.muted, fontFamily: "monospace" }}>{svc.serviceId}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: N.text, fontWeight: 600, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.name}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(217,119,6,0.1)", color: "#d97706" }}>
                        {svc.category}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: N.muted }}>${svc.rate.toFixed(4)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 800, color: "#16a34a" }}>₹{svc.customRate.toFixed(2)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: N.muted }}>{svc.minOrder.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: N.muted }}>{svc.maxOrder.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: N.bg, boxShadow: N.raisedSm, cursor: "pointer", color: N.text, fontWeight: 700, fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}
              >← Prev</button>
              <span style={{ fontSize: 12, color: N.muted, fontWeight: 700 }}>Page {page} of {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: N.bg, boxShadow: N.raisedSm, cursor: "pointer", color: N.text, fontWeight: 700, fontSize: 12, opacity: page === pages ? 0.4 : 1 }}
              >Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmToggle && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div style={{ background: N.bg, borderRadius: 24, padding: 36, maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: N.text, margin: "0 0 12px" }}>
              {settings.mtpMode ? "⚠️ Deactivate Provider Mode?" : "⚡ Activate Provider Mode?"}
            </h3>
            <p style={{ fontSize: 13, color: N.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
              {settings.mtpMode
                ? "This will immediately restore the original dashboard for all users. Existing orders are unaffected."
                : "This will immediately switch the user dashboard to this provider's service catalog. Make sure the API key is set and services are synced."}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={toggleMode}
                disabled={saving}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: settings.mtpMode ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#16a34a,#22c55e)",
                  color: "#fff", fontWeight: 900, fontSize: 14,
                }}
              >
                {saving ? "Applying…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmToggle(false)}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: N.bg, color: N.text, fontWeight: 700, fontSize: 14, boxShadow: N.raisedSm,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
