"use client";

import { useState, useEffect } from "react";

const N = {
  bg: "#eef2f7",
  raised: "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset: "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent: "#d97706",
  accentBg: "linear-gradient(135deg, #d97706, #ea580c)",
  text: "#2d3748",
  muted: "#718096",
  border: "rgba(200, 208, 231, 0.4)",
};

interface Log {
  id: string;
  panelId: string;
  platform: string;
  type: string;
  oldServiceId: string;
  newServiceId: string;
  oldServiceName: string | null;
  newServiceName: string | null;
  reason: string;
  createdAt: string;
  panel: { name: string; apiUrl: string };
}

export function AutoSyncTab() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const secret = localStorage.getItem("yoyo_admin_secret") || "";
    fetch("/api/admin/auto-sync-logs", {
      headers: { "x-admin-secret": secret }
    })
      .then(res => res.json())
      .then(data => {
        if (data.logs) setLogs(data.logs);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: 24, background: N.bg, borderRadius: 24, boxShadow: N.raised }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: N.text, margin: 0 }}>Auto-Sync Logs</h2>
          <p style={{ fontSize: 14, color: N.muted, marginTop: 4 }}>History of automated service failovers. Runs every 5 minutes.</p>
        </div>
      </div>

      <div style={{ background: N.bg, borderRadius: 16, boxShadow: N.inset, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: N.muted }}>Loading logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: N.muted }}>No failovers have occurred yet. Services are healthy.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                <th style={{ padding: 16, textAlign: "left", fontSize: 12, color: N.muted }}>Date</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 12, color: N.muted }}>Panel</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 12, color: N.muted }}>Target</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 12, color: N.muted }}>Old Service</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 12, color: N.muted }}>New Service</th>
                <th style={{ padding: 16, textAlign: "left", fontSize: 12, color: N.muted }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: `1px solid ${N.border}` }}>
                  <td style={{ padding: 16, fontSize: 13, color: N.text }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ padding: 16, fontSize: 13, color: N.text, fontWeight: 700 }}>{log.panel.name}</td>
                  <td style={{ padding: 16, fontSize: 13, color: N.text }}>
                    <span style={{ padding: "4px 8px", background: "#3b82f61A", color: "#2563eb", borderRadius: 6, fontWeight: 700, fontSize: 11, marginRight: 8 }}>
                      {log.platform}
                    </span>
                    <span style={{ padding: "4px 8px", background: "#8b5cf61A", color: "#7c3aed", borderRadius: 6, fontWeight: 700, fontSize: 11 }}>
                      {log.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: 16, fontSize: 12, color: N.muted }}>
                    <strong>{log.oldServiceId}</strong><br/>
                    {log.oldServiceName}
                  </td>
                  <td style={{ padding: 16, fontSize: 12, color: "#16a34a" }}>
                    <strong>{log.newServiceId}</strong><br/>
                    {log.newServiceName}
                  </td>
                  <td style={{ padding: 16, fontSize: 12, color: N.muted }}>{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
