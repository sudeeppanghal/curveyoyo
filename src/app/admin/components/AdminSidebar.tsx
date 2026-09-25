"use client";

import React from "react";

export type AdminTab = 
  | "overview" 
  | "users" 
  | "orders" 
  | "panels" 
  | "payments" 
  | "tickets" 
  | "blogs" 
  | "announcements" 
  | "auto_sync" 
  | "settings";

interface SidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export function AdminSidebar({ activeTab, setActiveTab, collapsed, setCollapsed }: SidebarProps) {
  const navItems: { id: AdminTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "🏠" },
    { id: "users", label: "Users Management", icon: "👥" },
    { id: "orders", label: "Orders & Queue", icon: "🛒" },
    { id: "panels", label: "SMM Panels", icon: "🔌" },
    { id: "payments", label: "Payments & UPI", icon: "💳" },
    { id: "tickets", label: "Support Tickets", icon: "🎫" },
    { id: "blogs", label: "Blog & SEO", icon: "📝" },
    { id: "announcements", label: "Announcements", icon: "📢" },
    { id: "auto_sync", label: "Auto Sync Logs", icon: "🔄" },
    { id: "settings", label: "System Settings", icon: "⚙️" },
  ];

  return (
    <aside style={{
      width: collapsed ? 80 : 270,
      minHeight: "100vh",
      background: "#FFFFFF",
      borderRight: "1px solid #E2E8F0",
      padding: "24px 16px",
      display: "flex",
      flexDirection: "column",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      position: "sticky",
      top: 0,
      zIndex: 40,
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
    }}>
      {/* Brand Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        marginBottom: 32,
        padding: "0 8px"
      }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "linear-gradient(135deg, #4318FF, #5925DC)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: 18,
              boxShadow: "0 8px 16px rgba(67, 24, 255, 0.25)"
            }}>
              Y
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#1B2559", letterSpacing: "-0.4px" }}>YoyoSMM</div>
              <div style={{ fontSize: 11, color: "#A3AED0", fontWeight: 600 }}>Admin Panel</div>
            </div>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "#F4F7FE",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            color: "#A3AED0",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "➡️" : "⬅️"}
        </button>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: collapsed ? "12px" : "12px 18px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 14,
                border: "none",
                background: isActive ? "#F0F3FF" : "transparent",
                color: isActive ? "#4318FF" : "#A3AED0",
                fontWeight: isActive ? 700 : 600,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <span style={{ fontSize: 18, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* VPS Health Card at Bottom */}
      {!collapsed && (
        <div style={{
          marginTop: "auto",
          padding: 16,
          borderRadius: 16,
          background: "#F0FDF4",
          border: "1px solid #DCFCE7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 8px #10B981"
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#15803D" }}>VPS Health Normal</span>
            </div>
            <div style={{ fontSize: 10, color: "#166534", marginTop: 2 }}>All services operational</div>
          </div>
          <svg width="32" height="18" viewBox="0 0 32 18" fill="none">
            <path d="M1 9L6 9L9 3L13 15L17 7L20 11L23 9L31 9" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </aside>
  );
}
