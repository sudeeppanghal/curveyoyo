"use client";

import React from "react";

interface HeaderProps {
  activeSecret: string;
  setActiveSecret: (s: string) => void;
  onRefresh: () => void;
  loading: boolean;
  totalUsersCount: number;
  activeOrdersCount: number;
}

export function AdminHeader({
  activeSecret,
  setActiveSecret,
  onRefresh,
  loading,
  totalUsersCount,
  activeOrdersCount,
}: HeaderProps) {
  return (
    <header style={{
      padding: "24px 36px 12px",
      background: "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 20,
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
    }}>
      {/* Title & Subtitle */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1B2559", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
          Welcome back, Admin! 👋
        </h1>
        <p style={{ fontSize: 14, color: "#A3AED0", margin: 0, fontWeight: 500 }}>
          Here's what's happening with your SMM panel today.
        </p>
      </div>

      {/* Action Pills & Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Users counter pill */}
        <div style={{
          padding: "10px 16px",
          borderRadius: 14,
          background: "#FFFFFF",
          boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid #F4F7FE"
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "#F4F7FE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4318FF",
            fontSize: 16
          }}>
            👤
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#A3AED0", fontWeight: 700, textTransform: "uppercase" }}>Users</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1B2559" }}>{totalUsersCount.toLocaleString()}</div>
          </div>
        </div>

        {/* Active Orders counter pill */}
        <div style={{
          padding: "10px 16px",
          borderRadius: 14,
          background: "#FFFFFF",
          boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid #F4F7FE"
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "#F4F7FE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4318FF",
            fontSize: 16
          }}>
            🛒
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#A3AED0", fontWeight: 700, textTransform: "uppercase" }}>Active Orders</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#10B981" }}>{activeOrdersCount.toLocaleString()}</div>
          </div>
        </div>

        {/* Notification Bell */}
        <button style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          background: "#FFFFFF",
          border: "1px solid #F4F7FE",
          boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative"
        }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <div style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#EE5D50"
          }} />
        </button>

        {/* Refresh Stats Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: "12px 22px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #4318FF, #5925DC)",
            border: "none",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0px 18px 40px rgba(67, 24, 255, 0.3)",
            transition: "all 0.15s ease",
            opacity: loading ? 0.8 : 1
          }}
        >
          <span style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>🔄</span>
          {loading ? "Syncing..." : "Refresh Stats"}
        </button>

        {/* Admin Profile Circle */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 14px",
          borderRadius: 16,
          background: "#FFFFFF",
          border: "1px solid #F4F7FE",
          boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)"
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#E6F4EA",
            color: "#1E8E3E",
            fontWeight: 800,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            AD
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1B2559" }}>Admin</div>
            <div style={{ fontSize: 10, color: "#A3AED0", fontWeight: 600 }}>Super Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
