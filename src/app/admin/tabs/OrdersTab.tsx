"use client";

import React, { useState } from "react";

interface Order {
  id: string;
  status: string;
  viewsTarget: number;
  viewsRemaining: number;
  priceCharged: number;
  createdAt: string;
  updatedAt?: string;
  reel?: { url: string; platform: string };
  panel?: { name: string };
  user?: { email: string };
}

interface OrdersTabProps {
  orders: Order[];
  onRetryOrder?: (orderId: string) => Promise<void>;
  loading: boolean;
}

export function OrdersTab({ orders, onRetryOrder, loading }: OrdersTabProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === "ALL" || o.status === filterStatus;
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.reel && o.reel.url.toLowerCase().includes(search.toLowerCase())) ||
      (o.user && o.user.email.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: 12, fontWeight: 700 }}>Completed</span>;
      case "DELIVERING":
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", fontSize: 12, fontWeight: 700 }}>🚀 Delivering</span>;
      case "FAILED":
      case "CANCELLED":
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", fontSize: 12, fontWeight: 700 }}>Failed</span>;
      default:
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>{status}</span>;
    }
  };

  const getRunningDuration = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - created);
    const mins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h running`;
    if (hours > 0) return `${hours}h ${mins % 60}m running`;
    return `${mins}m running`;
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
        {/* Search input */}
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <span style={{ position: "absolute", left: 14, top: 12, color: "#64748b" }}>🔍</span>
          <input
            type="text"
            placeholder="Search by Order ID, Reel URL, or user email..."
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

        {/* Status Pills Filter */}
        <div style={{ display: "flex", gap: 8 }}>
          {["ALL", "DELIVERING", "COMPLETED", "FAILED", "PENDING"].map((st) => (
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

      {/* Orders Table */}
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
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Order ID / User</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Start Time & Running Duration</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Reel Link</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Delivery Progress</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Charged</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => {
                const target = o.viewsTarget || 1;
                const remaining = o.viewsRemaining || 0;
                const delivered = Math.max(0, target - remaining);
                const pct = Math.min(100, Math.round((delivered / target) * 100));
                const startDate = new Date(o.createdAt);

                return (
                  <tr key={o.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#1B2559" }}>{o.user?.email || "Unknown User"}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>ID: {o.id}</div>
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#1B2559", fontSize: 13 }}>
                        {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginTop: 2 }}>
                        ⏱ {getRunningDuration(o.createdAt)}
                      </div>
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      {o.reel?.url ? (
                        <a
                          href={o.reel.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#60a5fa", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
                        >
                          🔗 Open Reel ↗
                        </a>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: 12 }}>No URL</span>
                      )}
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Panel: {o.panel?.name || "Default"}</div>
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      {getStatusBadge(o.status)}
                    </td>

                    <td style={{ padding: "16px 20px", minWidth: 180 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#1B2559", fontWeight: 700 }}>{delivered.toLocaleString()} / {target.toLocaleString()}</span>
                        <span style={{ color: "#f59e0b", fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, width: "100%", borderRadius: 4, background: "rgba(255, 255, 255, 0.1)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #f59e0b, #10b981)", transition: "width 0.3s ease" }} />
                      </div>
                    </td>

                    <td style={{ padding: "16px 20px", fontWeight: 800, color: "#1B2559" }}>
                      ₹{o.priceCharged.toFixed(2)}
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
