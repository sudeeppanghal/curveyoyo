"use client";

import React, { useState } from "react";

interface UpiPayment {
  id: string;
  utr: string;
  amount: number;
  status: string;
  createdAt: string;
  user?: { email: string };
  rejectedReason?: string;
}

interface PaymentsTabProps {
  upiPayments: UpiPayment[];
  onUpdateUpiStatus?: (paymentId: string, status: string, reason?: string) => Promise<void>;
  loading: boolean;
}

export function PaymentsTab({ upiPayments, onUpdateUpiStatus, loading }: PaymentsTabProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = upiPayments.filter((p) => {
    const matchesStatus = filterStatus === "ALL" || p.status === filterStatus;
    const matchesSearch =
      p.utr.toLowerCase().includes(search.toLowerCase()) ||
      (p.user && p.user.email.toLowerCase().includes(search.toLowerCase())) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!onUpdateUpiStatus) return;
    setUpdatingId(id);
    try {
      await onUpdateUpiStatus(id, newStatus);
    } catch (e) {
      alert("Failed to update payment status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
      case "APPROVED":
      case "SUCCESS":
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: 12, fontWeight: 700 }}>Confirmed</span>;
      case "REJECTED":
      case "FAILED":
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", fontSize: 12, fontWeight: 700 }}>Rejected</span>;
      default:
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>Pending Review</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Controls Bar */}
      <div style={{
        padding: "20px 24px",
        borderRadius: 18,
        background: "#FFFFFF", boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
        backdropFilter: "blur(12px)",
        border: "1px solid #F4F7FE",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap"
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <span style={{ position: "absolute", left: 14, top: 12, color: "#64748b" }}>🔍</span>
          <input
            type="text"
            placeholder="Search by UTR Number or User Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: 12,
              background: "#F4F7FE",
              border: "1px solid #E2E8F0",
              color: "#1B2559",
              fontSize: 14,
              outline: "none"
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 8 }}>
          {["ALL", "CONFIRMED", "PENDING", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                background: filterStatus === st ? "#f59e0b" : "rgba(255, 255, 255, 0.04)",
                color: filterStatus === st ? "#ffffff" : "#94a3b8",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        borderRadius: 18,
        background: "#FFFFFF", boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
        backdropFilter: "blur(12px)",
        border: "1px solid #F4F7FE",
        overflow: "hidden"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>User / Email</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>UTR Number</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Amount (₹)</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Date</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                  No payment records found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const date = new Date(p.createdAt);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#1B2559" }}>{p.user?.email || "Unknown User"}</div>
                    </td>

                    <td style={{ padding: "16px 20px", fontWeight: 800, color: "#fbbf24", fontFamily: "monospace" }}>
                      {p.utr}
                    </td>

                    <td style={{ padding: "16px 20px", fontWeight: 800, color: "#10b981" }}>
                      ₹{p.amount.toFixed(2)}
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      {getStatusBadge(p.status)}
                    </td>

                    <td style={{ padding: "16px 20px", color: "#94a3b8", fontSize: 12 }}>
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      {p.status === "PENDING" && (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          <button
                            onClick={() => handleStatusChange(p.id, "CONFIRMED")}
                            disabled={updatingId === p.id}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              background: "rgba(16, 185, 129, 0.2)",
                              border: "1px solid rgba(16, 185, 129, 0.4)",
                              color: "#10b981",
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: "pointer"
                            }}
                          >
                            Approve ✓
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.id, "REJECTED")}
                            disabled={updatingId === p.id}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              background: "rgba(239, 68, 68, 0.2)",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              color: "#ef4444",
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: "pointer"
                            }}
                          >
                            Reject ✗
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
