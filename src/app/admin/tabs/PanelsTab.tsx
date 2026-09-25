"use client";

import React, { useState } from "react";

interface Panel {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  priority: number;
  loadPercentage: number;
  balance?: number;
  status?: string;
}

interface PanelsTabProps {
  panels: Panel[];
  onSavePanel: (panelData: any) => Promise<void>;
  onTestPanel: (panelId: string) => Promise<void>;
  onDeletePanel: (panelId: string) => Promise<void>;
  loading: boolean;
}

export function PanelsTab({ panels, onSavePanel, onTestPanel, onDeletePanel, loading }: PanelsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", apiUrl: "", apiKey: "", priority: 1, loadPercentage: 100 });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await onTestPanel(id);
    } catch (e) {
      alert("Failed to test panel connection");
    } finally {
      setTestingId(null);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.apiUrl || !form.apiKey) {
      alert("Please fill in panel Name, API URL, and API Key");
      return;
    }
    setSaving(true);
    try {
      await onSavePanel(form);
      setShowAddModal(false);
      setForm({ name: "", apiUrl: "", apiKey: "", priority: 1, loadPercentage: 100 });
    } catch (e) {
      alert("Failed to save panel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header bar */}
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
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1B2559", margin: 0 }}>
            SMM Provider Integration Panels
          </h3>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
            Manage SMM reseller API keys, balances, and load balancing priorities.
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            border: "none",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer"
          }}
        >
          + Add New Panel
        </button>
      </div>

      {/* Panels Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 20
      }}>
        {panels.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#64748b", background: "#FFFFFF", boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)", borderRadius: 18 }}>
            No SMM panels configured. Click "+ Add New Panel" above.
          </div>
        ) : (
          panels.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 24,
                borderRadius: 18,
                background: "#FFFFFF", boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
                border: "1px solid #F4F7FE",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: "#1B2559", margin: "0 0 4px" }}>{p.name}</h4>
                  <div style={{ fontSize: 11, color: "#64748b", wordBreak: "break-all" }}>{p.apiUrl}</div>
                </div>
                <span style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  fontSize: 12,
                  fontWeight: 700
                }}>
                  Priority #{p.priority}
                </span>
              </div>

              {/* Balance Box */}
              <div style={{
                padding: 14,
                borderRadius: 12,
                background: "#F4F7FE",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>API Balance:</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>
                  {p.balance !== undefined ? `$${p.balance.toFixed(2)}` : "Click Test to fetch"}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => handleTest(p.id)}
                  disabled={testingId === p.id}
                  style={{
                    flex: 1,
                    padding: "9px 14px",
                    borderRadius: 10,
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    color: "#60a5fa",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: testingId === p.id ? "not-allowed" : "pointer"
                  }}
                >
                  {testingId === p.id ? "Testing..." : "⚡ Test Connection"}
                </button>

                <button
                  onClick={() => { if (confirm(`Delete panel ${p.name}?`)) onDeletePanel(p.id); }}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#ef4444",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Panel Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100
        }}>
          <div style={{
            width: 440,
            padding: 28,
            borderRadius: 20,
            background: "#0f172a",
            border: "1px solid #E2E8F0",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1B2559", margin: 0 }}>Add New SMM Provider Panel</h3>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 4 }}>Panel Name</label>
              <input
                type="text"
                placeholder="e.g. YoYo1 or MainPanel"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: "100%", padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 4 }}>API URL</label>
              <input
                type="text"
                placeholder="https://provider.com/api/v2"
                value={form.apiUrl}
                onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                style={{ width: "100%", padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 4 }}>API Key</label>
              <input
                type="password"
                placeholder="Enter Provider API Key"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                style={{ width: "100%", padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ padding: "10px 18px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc", fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                style={{ padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Saving..." : "Save Panel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
