"use client";

import React, { useState, useEffect } from "react";

interface Message {
  id: string;
  sender: "USER" | "ADMIN";
  message: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: "OPEN" | "ANSWERED" | "CLOSED" | string;
  createdAt: string;
  user?: { email: string; name: string | null };
  messages: Message[];
}

interface TicketsTabProps {
  secret: string;
}

export function TicketsTab({ secret }: TicketsTabProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState("ANSWERED");
  const [sending, setSending] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        headers: { "x-admin-secret": secret }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (e) {
      console.error("[Tickets Fetch Error]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [secret]);

  const filtered = tickets.filter((t) => {
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchesSearch =
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      (t.user && t.user.email.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          message: replyMessage,
          status: replyStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setReplyMessage("");
        fetchTickets();
      } else {
        alert("Failed to send reply");
      }
    } catch (e) {
      alert("Error sending ticket reply");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret
        },
        body: JSON.stringify({ id: ticketId, status: newStatus })
      });
      if (res.ok) {
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
        fetchTickets();
      }
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", fontSize: 12, fontWeight: 700 }}>Open</span>;
      case "ANSWERED":
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: 12, fontWeight: 700 }}>Answered</span>;
      case "CLOSED":
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(148, 163, 184, 0.15)", color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>Closed</span>;
      default:
        return <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>{status}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Search and Filters */}
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
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <span style={{ position: "absolute", left: 14, top: 12, color: "#64748b" }}>🔍</span>
          <input
            type="text"
            placeholder="Search tickets by subject, ID or user email..."
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

        <div style={{ display: "flex", gap: 8 }}>
          {["ALL", "OPEN", "ANSWERED", "CLOSED"].map((st) => (
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

      {/* Tickets Table */}
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
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Subject & Message</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700 }}>Date</th>
              <th style={{ padding: "16px 20px", color: "#94a3b8", fontWeight: 700, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
                  Loading support tickets...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                  No tickets found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const date = new Date(t.createdAt);
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#1B2559" }}>{t.user?.email || "User"}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>ID: {t.id.substring(0, 12)}...</div>
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#fbbf24", fontSize: 14 }}>{t.subject}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.message}
                      </div>
                    </td>

                    <td style={{ padding: "16px 20px" }}>
                      {getStatusBadge(t.status)}
                    </td>

                    <td style={{ padding: "16px 20px", color: "#94a3b8", fontSize: 12 }}>
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <button
                        onClick={() => setSelectedTicket(t)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          background: "linear-gradient(135deg, #f59e0b, #d97706)",
                          border: "none",
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer"
                        }}
                      >
                        Open Ticket 💬
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Ticket Conversation Modal */}
      {selectedTicket && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100
        }}>
          <div style={{
            width: 600,
            maxHeight: "85vh",
            padding: 28,
            borderRadius: 20,
            background: "#0f172a",
            border: "1px solid #E2E8F0",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1B2559", margin: "0 0 4px" }}>
                  {selectedTicket.subject}
                </h3>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  From: <strong style={{ color: "#fbbf24" }}>{selectedTicket.user?.email}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Chat History */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              borderRadius: 14,
              background: "#F4F7FE",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxHeight: 320
            }}>
              {/* Initial message */}
              <div style={{
                alignSelf: "flex-start",
                maxWidth: "80%",
                padding: "12px 16px",
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid #F4F7FE"
              }}>
                <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>
                  User Message ({new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </div>
                <div style={{ fontSize: 13, color: "#1B2559" }}>{selectedTicket.message}</div>
              </div>

              {/* Subsequent messages */}
              {selectedTicket.messages && selectedTicket.messages.map((m) => {
                const isAdmin = m.sender === "ADMIN";
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isAdmin ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      padding: "12px 16px",
                      borderRadius: 14,
                      background: isAdmin ? "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))" : "rgba(255, 255, 255, 0.06)",
                      border: isAdmin ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)"
                    }}
                  >
                    <div style={{ fontSize: 11, color: isAdmin ? "#fbbf24" : "#94a3b8", fontWeight: 700, marginBottom: 4 }}>
                      {isAdmin ? "Admin Reply" : "User Reply"} ({new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </div>
                    <div style={{ fontSize: 13, color: "#1B2559" }}>{m.message}</div>
                  </div>
                );
              })}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <textarea
                placeholder="Type your official admin response..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                  resize: "none"
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Set Status:</span>
                  <select
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 12
                    }}
                  >
                    <option value="ANSWERED">Answered</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedTicket.id, selectedTicket.status === "CLOSED" ? "OPEN" : "CLOSED")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#cbd5e1",
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    {selectedTicket.status === "CLOSED" ? "Re-open Ticket" : "Close Ticket"}
                  </button>

                  <button
                    type="submit"
                    disabled={sending || !replyMessage.trim()}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      border: "none",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: sending ? "not-allowed" : "pointer"
                    }}
                  >
                    {sending ? "Sending..." : "Send Reply 📤"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
