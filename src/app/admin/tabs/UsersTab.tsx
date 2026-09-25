"use client";

import React, { useState } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
  balance: number;
  bonusBalance?: number;
  plan?: string;
  createdAt: string;
  supabaseId?: string;
}

interface UsersTabProps {
  users: User[];
  onUpdateUserBalance: (userId: string, balance: number, bonusBalance: number) => Promise<void>;
  onImpersonate: (userEmail: string) => void;
  loading: boolean;
}

export function UsersTab({ users, onUpdateUserBalance, onImpersonate, loading }: UsersTabProps) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newBalance, setNewBalance] = useState<string>("");
  const [newBonus, setNewBonus] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.id.toLowerCase().includes(search.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEditOpen = (u: User) => {
    setSelectedUser(u);
    setNewBalance(u.balance.toString());
    setNewBonus((u.bonusBalance || 0).toString());
  };

  const handleSaveBalance = async () => {
    if (!selectedUser) return;
    setUpdating(true);
    try {
      await onUpdateUserBalance(
        selectedUser.id,
        parseFloat(newBalance || "0"),
        parseFloat(newBonus || "0")
      );
      setSelectedUser(null);
    } catch (e) {
      alert("Failed to update user balance");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Search Header Bar */}
      <div style={{
        padding: "20px 24px",
        borderRadius: 18,
        background: "#FFFFFF", boxShadow: "0px 18px 40px rgba(112, 144, 176, 0.08)",
        backdropFilter: "blur(12px)",
        border: "1px solid #F4F7FE",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16
      }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
          <span style={{ position: "absolute", left: 14, top: 12, color: "#64748b" }}>🔍</span>
          <input
            type="text"
            placeholder="Search users by email, name or ID..."
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
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          Showing <strong style={{ color: "#f59e0b" }}>{filteredUsers.length}</strong> of {users.length} users
        </div>
      </div>

      {/* Users Data Table */}
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
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Balance (₹)</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Bonus (₹)</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Joined</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                  No users found matching "{search}"
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontWeight: 700, color: "#1B2559" }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>ID: {u.id.substring(0, 14)}...</div>
                  </td>
                  <td style={{ padding: "16px 20px", fontWeight: 800, color: "#10b981" }}>
                    ₹{u.balance.toFixed(2)}
                  </td>
                  <td style={{ padding: "16px 20px", fontWeight: 700, color: "#f59e0b" }}>
                    ₹{(u.bonusBalance || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: "16px 20px", color: "#94a3b8", fontSize: 12 }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                      <button
                        onClick={() => handleEditOpen(u)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          color: "#fbbf24",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Edit Balance
                      </button>

                      <button
                        onClick={() => onImpersonate(u.email)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          background: "rgba(59, 130, 246, 0.15)",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          color: "#60a5fa",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Login as User 🔑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Balance Modal */}
      {selectedUser && (
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
            width: 420,
            padding: 28,
            borderRadius: 20,
            background: "#0f172a",
            border: "1px solid #E2E8F0",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)"
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1B2559", margin: 0 }}>
              Edit Balance for {selectedUser.email}
            </h3>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                Main Balance (₹)
              </label>
              <input
                type="number"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  background: "#F4F7FE",
                  border: "1px solid #E2E8F0",
                  color: "#1B2559",
                  fontSize: 14
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                Bonus Balance (₹)
              </label>
              <input
                type="number"
                value={newBonus}
                onChange={(e) => setNewBonus(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  background: "#F4F7FE",
                  border: "1px solid #E2E8F0",
                  color: "#1B2559",
                  fontSize: 14
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid #E2E8F0",
                  color: "#cbd5e1",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBalance}
                disabled={updating}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: updating ? "not-allowed" : "pointer"
                }}
              >
                {updating ? "Saving..." : "Save Balance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
