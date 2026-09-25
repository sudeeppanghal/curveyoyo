"use client";

import React from "react";

interface DepositStats {
  today: number;
  last7Days: number;
  last30Days: number;
  last60Days: number;
  total: number;
}

interface OverviewProps {
  stats: {
    totalUsers: number;
    totalOrders: number;
    deliveringOrders: number;
    completedOrders: number;
    deposits: DepositStats;
    panelCount: number;
    systemHealth: string;
  };
  onNavigate: (tab: any) => void;
}

export function OverviewTab({ stats, onNavigate }: OverviewProps) {
  const depositCards = [
    {
      label: "Today's Deposits",
      value: `₹${stats.deposits.today.toLocaleString()}`,
      badge: "0% from yesterday",
      badgeColor: "#10B981",
      badgeBg: "#ECFDF5",
      iconBg: "#DCFCE7",
      iconColor: "#10B981",
      stroke: "#10B981",
      path: "M0 25 Q 30 15, 60 20 T 120 5 T 180 18 T 220 2"
    },
    {
      label: "Last 7 Days Deposits",
      value: `₹${stats.deposits.last7Days.toLocaleString()}`,
      badge: "↑ 12.5% from previous 7 days",
      badgeColor: "#10B981",
      badgeBg: "#ECFDF5",
      iconBg: "#E0E7FF",
      iconColor: "#4318FF",
      stroke: "#4318FF",
      path: "M0 28 Q 40 10, 80 22 T 140 8 T 200 15 T 220 5"
    },
    {
      label: "Last 30 Days (1 Mo)",
      value: `₹${stats.deposits.last30Days.toLocaleString()}`,
      badge: "↑ 18.3% from previous month",
      badgeColor: "#10B981",
      badgeBg: "#ECFDF5",
      iconBg: "#F3E8FF",
      iconColor: "#8B5CF6",
      stroke: "#8B5CF6",
      path: "M0 20 Q 35 25, 70 12 T 130 18 T 190 6 T 220 2"
    },
    {
      label: "Last 60 Days (2 Mo)",
      value: `₹${stats.deposits.last60Days.toLocaleString()}`,
      badge: "↑ 22.1% from previous 60 days",
      badgeColor: "#10B981",
      badgeBg: "#ECFDF5",
      iconBg: "#E0F2FE",
      iconColor: "#0284C7",
      stroke: "#0284C7",
      path: "M0 26 Q 45 18, 90 22 T 150 10 T 200 12 T 220 4"
    },
    {
      label: "Total All-Time Deposits",
      value: `₹${stats.deposits.total.toLocaleString()}`,
      badge: "All time total earnings",
      badgeColor: "#D97706",
      badgeBg: "#FEF3C7",
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      stroke: "#F59E0B",
      path: "M0 24 Q 40 28, 80 14 T 140 20 T 190 8 T 220 2"
    },
  ];

  const operationalCards = [
    { label: "Total Registered Users", value: stats.totalUsers.toLocaleString(), sub: "↑ +24 this week", icon: "👤", bg: "#EFF6FF", iconColor: "#3B82F6", tab: "users" },
    { label: "Total Orders Placed", value: stats.totalOrders.toLocaleString(), sub: "↑ +18 this week", icon: "🛒", bg: "#EFF6FF", iconColor: "#3B82F6", tab: "orders" },
    { label: "Active Delivering", value: stats.deliveringOrders.toLocaleString(), sub: "Real-time", icon: "🚀", bg: "#F3E8FF", iconColor: "#8B5CF6", tab: "orders" },
    { label: "Completed Orders", value: stats.completedOrders.toLocaleString(), sub: "↑ +32 this week", icon: "✅", bg: "#ECFDF5", iconColor: "#10B981", tab: "orders" },
    { label: "Active SMM Panels", value: stats.panelCount.toString(), sub: "All systems active", icon: "🔌", bg: "#F3E8FF", iconColor: "#8B5CF6", tab: "panels" },
  ];

  const recentOrdersMock = [
    { id: "#ORD-00123", service: "Instagram Followers", status: "Completed", color: "#10B981", bg: "#ECFDF5", platform: "📷" },
    { id: "#ORD-00122", service: "YouTube Views", status: "Processing", color: "#3B82F6", bg: "#EFF6FF", platform: "▶️" },
    { id: "#ORD-00121", service: "TikTok Likes", status: "Pending", color: "#F59E0B", bg: "#FEF3C7", platform: "🎵" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      {/* 1. Deposit & System Performance Console Banner */}
      <div style={{
        padding: "24px 32px",
        borderRadius: 20,
        background: "linear-gradient(135deg, #EFF6FF 0%, #E0E7FF 100%)",
        border: "1px solid #E0E7FF",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)"
      }}>
        {/* Background Wave Graphic */}
        <svg style={{ position: "absolute", right: 180, bottom: 0, opacity: 0.25 }} width="300" height="90" viewBox="0 0 300 90" fill="none">
          <path d="M0 70 C 60 20, 120 80, 180 30 C 240 -10, 270 50, 300 10 L 300 90 L 0 90 Z" fill="#4318FF" />
        </svg>

        <div style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 2 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 6px 16px rgba(67, 24, 255, 0.15)"
          }}>
            📲
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1B2559", margin: "0 0 4px" }}>
              Deposit & System Performance Console
            </h2>
            <p style={{ fontSize: 13, color: "#A3AED0", margin: 0, fontWeight: 500 }}>
              Real-time tracking for user deposits, active orders, and SMM provider connections.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate("payments")}
          style={{
            padding: "11px 22px",
            borderRadius: 14,
            background: "#FFFFFF",
            border: "1px solid #4318FF",
            color: "#4318FF",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(67, 24, 255, 0.1)",
            zIndex: 2,
            transition: "all 0.15s"
          }}
        >
          View Payments →
        </button>
      </div>

      {/* 2. Deposit Financial Breakdown Section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1B2559", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>💳</span> Deposit Financial Breakdown
          </h3>
          <select style={{
            padding: "6px 14px",
            borderRadius: 12,
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            color: "#A3AED0",
            fontSize: 12,
            fontWeight: 700,
            outline: "none",
            cursor: "pointer"
          }}>
            <option>This Month</option>
            <option>This Week</option>
            <option>All Time</option>
          </select>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16
        }}>
          {depositCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate("payments")}
              style={{
                padding: "20px 22px",
                borderRadius: 20,
                background: "#FFFFFF",
                boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
                border: "1px solid #F4F7FE",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: 10
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#A3AED0" }}>{card.label}</span>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: card.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: card.iconColor
                }}>
                  📊
                </div>
              </div>

              <div style={{ fontSize: 24, fontWeight: 800, color: card.iconColor, letterSpacing: "-0.5px" }}>
                {card.value}
              </div>

              {/* Sparkline Curve */}
              <div style={{ height: 28, margin: "2px 0 4px" }}>
                <svg width="100%" height="28" viewBox="0 0 220 30" fill="none">
                  <path d={card.path} stroke={card.stroke} strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: card.badgeColor }}>
                {card.badge}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Operational Overview Section */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1B2559", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔮</span> Operational Overview
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16
        }}>
          {operationalCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate(card.tab)}
              style={{
                padding: "18px 20px",
                borderRadius: 20,
                background: "#FFFFFF",
                boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
                border: "1px solid #F4F7FE",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: card.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                color: card.iconColor
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#A3AED0" }}>{card.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1B2559", margin: "2px 0" }}>{card.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#10B981" }}>{card.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Bottom 3-Column Widgets Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 20
      }}>
        {/* Column 1: Orders Statistics Line Chart */}
        <div style={{
          padding: 24,
          borderRadius: 20,
          background: "#FFFFFF",
          boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
          border: "1px solid #F4F7FE",
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: "#1B2559", margin: 0 }}>Orders Statistics</h4>
            <select style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 11, color: "#A3AED0", outline: "none" }}>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 16, fontSize: 11, fontWeight: 700 }}>
            <span style={{ color: "#4318FF", display: "flex", alignItems: "center", gap: 6 }}>● Orders</span>
            <span style={{ color: "#10B981", display: "flex", alignItems: "center", gap: 6 }}>● Completed</span>
          </div>

          {/* Dual Line SVG Curve */}
          <div style={{ height: 160, width: "100%", position: "relative" }}>
            <svg width="100%" height="160" viewBox="0 0 300 160" fill="none">
              <path d="M 10 120 Q 50 40, 100 80 T 180 50 T 250 90 T 290 30" stroke="#4318FF" strokeWidth="3" fill="none" />
              <path d="M 10 140 Q 50 90, 100 110 T 180 80 T 250 110 T 290 70" stroke="#10B981" strokeWidth="3" fill="none" />
              <circle cx="180" cy="50" r="5" fill="#4318FF" />
              <circle cx="180" cy="80" r="5" fill="#10B981" />
            </svg>
          </div>
        </div>

        {/* Column 2: Recent Orders */}
        <div style={{
          padding: 24,
          borderRadius: 20,
          background: "#FFFFFF",
          boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
          border: "1px solid #F4F7FE",
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: "#1B2559", margin: 0 }}>Recent Orders</h4>
            <button onClick={() => onNavigate("orders")} style={{ background: "none", border: "none", color: "#4318FF", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              View All
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recentOrdersMock.map((o, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 14, background: "#F8FAFC" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                    {o.platform}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1B2559" }}>Order {o.id}</div>
                    <div style={{ fontSize: 11, color: "#A3AED0" }}>{o.service}</div>
                  </div>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 8, background: o.bg, color: o.color, fontSize: 11, fontWeight: 700 }}>
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: System Performance Gauge */}
        <div style={{
          padding: 24,
          borderRadius: 20,
          background: "#FFFFFF",
          boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
          border: "1px solid #F4F7FE",
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: "#1B2559", margin: 0 }}>System Performance</h4>
            <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              ● Live
            </span>
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {/* Donut Gauge */}
            <div style={{ position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="110" height="110" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#F4F7FE" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="40" stroke="#10B981" strokeWidth="8" fill="none" strokeDasharray="251" strokeDashoffset="12" strokeLinecap="round" />
              </svg>
              <div style={{ position: "absolute", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1B2559" }}>98%</div>
                <div style={{ fontSize: 9, color: "#A3AED0", fontWeight: 600 }}>System Health</div>
              </div>
            </div>

            {/* Metrics List */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#A3AED0", fontWeight: 700, marginBottom: 2 }}>
                  <span>CPU Usage</span>
                  <span style={{ color: "#1B2559" }}>24%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "#F4F7FE", overflow: "hidden" }}>
                  <div style={{ width: "24%", height: "100%", background: "#10B981" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#A3AED0", fontWeight: 700, marginBottom: 2 }}>
                  <span>Memory Usage</span>
                  <span style={{ color: "#1B2559" }}>45%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "#F4F7FE", overflow: "hidden" }}>
                  <div style={{ width: "45%", height: "100%", background: "#3B82F6" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#A3AED0", fontWeight: 700, marginBottom: 2 }}>
                  <span>Disk Usage</span>
                  <span style={{ color: "#1B2559" }}>68%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "#F4F7FE", overflow: "hidden" }}>
                  <div style={{ width: "68%", height: "100%", background: "#F59E0B" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#A3AED0", fontWeight: 700, marginBottom: 2 }}>
                  <span>Network</span>
                  <span style={{ color: "#1B2559" }}>89%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "#F4F7FE", overflow: "hidden" }}>
                  <div style={{ width: "89%", height: "100%", background: "#8B5CF6" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
