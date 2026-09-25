"use client";

import React, { useState } from "react";

interface AdminSettings {
  trc20Address: string | null;
  bep20Address: string | null;
  priceUsdt: number;
  siteName: string;
  freeTrialHours: number;
  maintenanceMode: boolean;
  supportEmail: string | null;
  upiId: string | null;
  upiQrCode: string | null;
  minDeposit: number;
  apifyKeys: string | null;
  instagramCookies: string | null;
}

interface SettingsTabProps {
  settings: AdminSettings;
  onSaveSettings: (newSettings: AdminSettings) => Promise<void>;
  loading: boolean;
}

export function SettingsTab({ settings, onSaveSettings, loading }: SettingsTabProps) {
  const [form, setForm] = useState<AdminSettings>(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings(form);
      alert("Settings saved successfully!");
    } catch (e) {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Save Button Header */}
      <div style={{
        padding: "20px 24px",
        borderRadius: 18,
        background: "#FFFFFF", boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
        backdropFilter: "blur(12px)",
        border: "1px solid #F4F7FE",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1B2559", margin: 0 }}>System Settings & Payment Gateway Config</h3>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Configure crypto wallets, UPI parameters, site maintenance mode, and API keys.</div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            border: "none",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer"
          }}
        >
          {saving ? "Saving Changes..." : "💾 Save Settings"}
        </button>
      </div>

      {/* Grid Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
        {/* Maintenance & General */}
        <div style={{ padding: 24, borderRadius: 18, background: "#FFFFFF", boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)", border: "1px solid #F4F7FE", display: "flex", flexDirection: "column", gap: 16 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b", margin: 0 }}>⚙️ General & Maintenance</h4>
          
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>Site Name</label>
            <input
              type="text"
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, background: "#F4F7FE", border: "1px solid #E2E8F0", color: "#fff", fontSize: 14 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, background: "rgba(0,0,0,0.2)" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#1B2559", fontSize: 14 }}>Maintenance Mode</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Temporarily pause user dashboard access</div>
            </div>
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
              style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#f59e0b" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>Minimum Deposit (₹)</label>
            <input
              type="number"
              value={form.minDeposit}
              onChange={(e) => setForm({ ...form, minDeposit: parseFloat(e.target.value || "0") })}
              style={{ width: "100%", padding: 10, borderRadius: 10, background: "#F4F7FE", border: "1px solid #E2E8F0", color: "#fff", fontSize: 14 }}
            />
          </div>
        </div>

        {/* Payment Gateways (UPI & Crypto) */}
        <div style={{ padding: 24, borderRadius: 18, background: "#FFFFFF", boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)", border: "1px solid #F4F7FE", display: "flex", flexDirection: "column", gap: 16 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b", margin: 0 }}>💳 UPI & Crypto Payment Settings</h4>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>UPI VPA / ID</label>
            <input
              type="text"
              placeholder="e.g. merchant@upi"
              value={form.upiId || ""}
              onChange={(e) => setForm({ ...form, upiId: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, background: "#F4F7FE", border: "1px solid #E2E8F0", color: "#fff", fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>TRC20 Wallet Address</label>
            <input
              type="text"
              placeholder="USDT TRC20 Address"
              value={form.trc20Address || ""}
              onChange={(e) => setForm({ ...form, trc20Address: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, background: "#F4F7FE", border: "1px solid #E2E8F0", color: "#fff", fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>BEP20 Wallet Address</label>
            <input
              type="text"
              placeholder="USDT BEP20 Address"
              value={form.bep20Address || ""}
              onChange={(e) => setForm({ ...form, bep20Address: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, background: "#F4F7FE", border: "1px solid #E2E8F0", color: "#fff", fontSize: 14 }}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
