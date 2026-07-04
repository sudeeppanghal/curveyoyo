import React, { useEffect, useState } from "react";

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

interface ProfitSplit {
  id: string;
  paymentId: string | null;
  source: string;
  amountInr: number;
  ankitShare: number;
  ramShare: number;
  createdAt: string;
}

export function ProfitSplitTab({ adminSecret }: { adminSecret: string }) {
  const [splits, setSplits] = useState<ProfitSplit[]>([]);
  const [totalAnkit, setTotalAnkit] = useState(0);
  const [totalRam, setTotalRam] = useState(0);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [adminSecret]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/profit", {
        headers: { "x-admin-secret": adminSecret }
      });
      if (res.ok) {
        const json = await res.json();
        setSplits(json.profitSplits || []);
        setTotalAnkit(json.totalAnkit || 0);
        setTotalRam(json.totalRam || 0);
        setTotalDeposited(json.totalDeposited || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, animation: "fadeIn 0.4s ease-out" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      `}</style>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: "0 0 4px" }}>Admin Profit Split</h2>
          <p style={{ fontSize: 13, color: N.muted, margin: 0, fontWeight: 600 }}>Automatically tracks 40% / 40% splits for Ankit and Ram on all deposits.</p>
        </div>
        <button
          onClick={fetchData}
          style={{
            padding: "8px 16px", borderRadius: 12, background: N.bg,
            boxShadow: N.raisedSm, border: "none", cursor: "pointer",
            fontWeight: 700, color: N.text, display: "flex", alignItems: "center", gap: 6
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-5.67"/></svg>
          Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
        {/* Total Deposited */}
        <div style={{ padding: 24, borderRadius: 20, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: N.muted, letterSpacing: 0.5 }}>TOTAL DEPOSITED (100%)</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: "#2563eb" }}>{formatCurrency(totalDeposited)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: N.muted }}>Total volume processed</span>
        </div>

        {/* Ankit Profit */}
        <div style={{ padding: 24, borderRadius: 20, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: N.muted, letterSpacing: 0.5 }}>ANKIT'S PROFIT (40%)</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: "#16a34a" }}>{formatCurrency(totalAnkit)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: N.muted }}>Auto-calculated share</span>
        </div>

        {/* Ram Profit */}
        <div style={{ padding: 24, borderRadius: 20, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: N.muted, letterSpacing: 0.5 }}>RAM'S PROFIT (40%)</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: "#16a34a" }}>{formatCurrency(totalRam)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: N.muted }}>Auto-calculated share</span>
        </div>

        {/* SMM Costs */}
        <div style={{ padding: 24, borderRadius: 20, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: N.muted, letterSpacing: 0.5 }}>SMM/API COSTS (20%)</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: "#dc2626" }}>{formatCurrency(totalDeposited - totalAnkit - totalRam)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: N.muted }}>Reserved for panel expenses</span>
        </div>
      </div>

      <div style={{ padding: 24, borderRadius: 24, background: N.bg, boxShadow: N.raised, marginTop: 10 }}>
        <h3 style={{ fontSize: 16, fontWeight: 850, color: N.text, margin: "0 0 16px" }}>Transaction Splits</h3>
        
        {loading ? (
          <p style={{ fontSize: 14, color: N.muted, fontWeight: 600 }}>Loading records...</p>
        ) : splits.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", borderRadius: 16, border: `1.5px dashed ${N.border}` }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: N.muted, fontWeight: 600 }}>No profit split records found yet.<br/>They will appear here automatically when a deposit is approved.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: N.muted, borderBottom: `2px solid ${N.border}` }}>DATE</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: N.muted, borderBottom: `2px solid ${N.border}` }}>SOURCE</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 800, color: N.muted, borderBottom: `2px solid ${N.border}` }}>DEPOSIT AMT</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 800, color: N.muted, borderBottom: `2px solid ${N.border}` }}>ANKIT (40%)</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 800, color: N.muted, borderBottom: `2px solid ${N.border}` }}>RAM (40%)</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 800, color: N.muted, borderBottom: `2px solid ${N.border}` }}>COSTS (20%)</th>
                </tr>
              </thead>
              <tbody>
                {splits.map((s) => {
                  const costs = s.amountInr - s.ankitShare - s.ramShare;
                  return (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background="rgba(255,255,255,0.4)"} onMouseOut={e => e.currentTarget.style.background="transparent"}>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: N.text }}>{new Date(s.createdAt).toLocaleString()}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: s.source === "UPI" ? "#dbeafe" : "#fef08a", color: s.source === "UPI" ? "#1e40af" : "#854d0e" }}>
                          {s.source}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#2563eb" }}>{formatCurrency(s.amountInr)}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#16a34a" }}>+{formatCurrency(s.ankitShare)}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#16a34a" }}>+{formatCurrency(s.ramShare)}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#dc2626" }}>-{formatCurrency(costs)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
