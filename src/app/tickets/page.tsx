"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  text:     "#2d3748",
  muted:    "#718096",
  border:   "rgba(200, 208, 231, 0.4)",
};

interface TicketMessage {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  messages?: TicketMessage[];
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Chat View State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  useEffect(() => {
    if (activeTicket) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket?.messages, selectedTicketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setMsg({ type: "err", text: "Please enter both subject and message." });
      return;
    }
    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "ok", text: "Support ticket submitted successfully!" });
        setSubject("");
        setMessage("");
        await fetchTickets();
        if (data.ticket?.id) {
          setSelectedTicketId(data.ticket.id);
        }
      } else {
        setMsg({ type: "err", text: data.error ?? "Failed to submit ticket." });
      }
    } catch (e) {
      setMsg({ type: "err", text: String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId) return;
    setReplying(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicketId, message: replyMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplyMessage("");
        await fetchTickets();
      } else {
        setMsg({ type: "err", text: data.error ?? "Failed to send reply." });
      }
    } catch (e) {
      setMsg({ type: "err", text: String(e) });
    } finally {
      setReplying(false);
    }
  };

  return (
    <div style={{ maxWidth: 850, display: "flex", flexDirection: "column", gap: 24, animation: "fadeUp 0.3s ease" }}>
      <style>{`
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Support Helpdesk &amp; Live Ticket Chat</h1>
        <p style={{ fontSize: 12, color: N.muted, margin: 0, fontWeight: 600 }}>Submit tickets and chat live with our support team for instant resolution</p>
      </div>

      {msg && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 14,
          background: msg.type === "ok" ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
          border: msg.type === "ok" ? "1px solid rgba(22,163,74,0.15)" : "1px solid rgba(220,38,38,0.15)",
          color: msg.type === "ok" ? "#16a34a" : "#dc2626",
          fontSize: 12,
          fontWeight: 700,
        }}>
          {msg.text}
        </div>
      )}

      {activeTicket ? (
        /* ACTIVE CHAT ROOM VIEW */
        <div style={{ background: N.bg, borderRadius: 24, padding: 24, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Chat Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1.5px solid ${N.border}`, paddingBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setSelectedTicketId(null)}
                className="neo-btn"
                style={{ padding: "8px 14px", borderRadius: 12, background: N.bg, boxShadow: N.raisedSm, border: "none", color: N.text, fontWeight: 800, fontSize: 12, cursor: "pointer" }}
              >
                ← Back to Tickets
              </button>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: N.text, margin: 0 }}>{activeTicket.subject}</h2>
                <span style={{ fontSize: 10, color: N.muted, fontWeight: 700 }}>Ticket ID: #{activeTicket.id}</span>
              </div>
            </div>
            <div>
              <span style={{
                fontSize: 11,
                fontWeight: 900,
                color: activeTicket.status === "OPEN" ? "#d97706" : activeTicket.status === "RESOLVED" ? "#16a34a" : "#718096",
                background: activeTicket.status === "OPEN" ? "rgba(217,119,6,0.1)" : activeTicket.status === "RESOLVED" ? "rgba(22,163,74,0.1)" : "rgba(113,128,150,0.1)",
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${activeTicket.status === "OPEN" ? "rgba(217,119,6,0.2)" : activeTicket.status === "RESOLVED" ? "rgba(22,163,74,0.2)" : "rgba(113,128,150,0.2)"}`,
                textTransform: "uppercase"
              }}>
                ● Status: {activeTicket.status}
              </span>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div style={{
            minHeight: 320,
            maxHeight: 480,
            overflowY: "auto",
            padding: "16px",
            borderRadius: 16,
            background: N.inset,
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            {(!activeTicket.messages || activeTicket.messages.length === 0) ? (
              /* Initial User Message for legacy tickets */
              <div style={{ alignSelf: "flex-end", maxWidth: "80%", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#d97706", alignSelf: "flex-end" }}>👤 You</span>
                <div style={{ padding: "14px 18px", borderRadius: "18px 18px 4px 18px", background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {activeTicket.message}
                </div>
                <span style={{ fontSize: 9, color: N.muted, fontWeight: 600, alignSelf: "flex-end" }}>
                  {new Date(activeTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ) : (
              activeTicket.messages.map((m) => {
                const isUser = m.sender === "USER";
                return (
                  <div key={m.id} style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "80%", display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: isUser ? "#d97706" : "#4f46e5", alignSelf: isUser ? "flex-end" : "flex-start" }}>
                      {isUser ? "👤 You" : "🛡️ Support Helpdesk"}
                    </span>
                    <div style={{
                      padding: "14px 18px",
                      borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isUser ? "#fef3c7" : "#e0e7ff",
                      color: isUser ? "#92400e" : "#3730a3",
                      fontSize: 13,
                      fontWeight: 600,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap"
                    }}>
                      {m.message}
                    </div>
                    <span style={{ fontSize: 9, color: N.muted, fontWeight: 600, alignSelf: isUser ? "flex-end" : "flex-start" }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Reply Footer */}
          {activeTicket.status === "CLOSED" ? (
            <div style={{ padding: 14, borderRadius: 14, background: "rgba(113,128,150,0.1)", textAlign: "center", fontSize: 12, fontWeight: 700, color: N.muted }}>
              🔒 This ticket is closed. If you have further questions, please raise a new ticket.
            </div>
          ) : (
            <form onSubmit={handleSendReply} style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <textarea
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
                placeholder="Type your reply to our support team..."
                rows={2}
                style={{ flex: 1, padding: "12px 16px", borderRadius: 14, fontSize: 13, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.inset, fontFamily: "inherit", resize: "none" }}
                className="neo-input"
              />
              <button
                type="submit"
                disabled={replying || !replyMessage.trim()}
                className="neo-btn"
                style={{
                  padding: "14px 24px",
                  borderRadius: 14,
                  background: !replyMessage.trim() ? N.muted : N.accent,
                  color: "#ffffff",
                  fontWeight: 800,
                  border: "none",
                  cursor: !replyMessage.trim() ? "not-allowed" : "pointer",
                  boxShadow: !replyMessage.trim() ? "none" : N.raisedSm,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  transition: "all 0.2s"
                }}
              >
                {replying ? "Sending..." : "🚀 Send Reply"}
              </button>
            </form>
          )}
        </div>
      ) : (
        /* STANDARD 2-COLUMN VIEW (FORM & LIST) */
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32, alignItems: "start" }}>
          {/* Create Ticket Form */}
          <form onSubmit={handleSubmit} style={{ background: N.bg, borderRadius: 24, padding: 24, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, color: N.text, margin: 0 }}>Create a New Ticket</h3>
            
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Cancel order cmqz..."
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 13, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.inset, fontFamily: "inherit" }}
                className="neo-input"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Message Details</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Please describe the issue or specify the order ID you want to cancel/refund..." rows={6}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 13, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.inset, fontFamily: "inherit", resize: "none" }}
                className="neo-input"
              />
            </div>

            <button type="submit" disabled={submitting} className="neo-btn"
              style={{ marginTop: 8, width: "100%", padding: "12px", borderRadius: 14, background: N.accent, color: "#ffffff", fontWeight: 800, border: "none", cursor: "pointer", boxShadow: N.raisedSm, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13 }}>
              {submitting ? "Submitting..." : "✉️ Submit Ticket"}
            </button>
          </form>

          {/* Support History */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, color: N.text, margin: 0 }}>Ticket History</h3>
            
            {loading ? (
              <p style={{ fontSize: 12, color: N.muted, fontWeight: 600 }}>Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <div style={{ padding: 20, background: N.bg, borderRadius: 16, boxShadow: N.inset, fontSize: 12, color: N.muted, fontWeight: 600, textAlign: "center" }}>
                No support tickets submitted yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
                {tickets.map(t => {
                  const badgeColor = t.status === "OPEN" ? "#d97706" : t.status === "RESOLVED" ? "#16a34a" : "#718096";
                  const msgCount = t.messages?.length || 1;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className="neo-btn"
                      style={{ padding: 16, borderRadius: 16, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 8, cursor: "pointer", transition: "all 0.2s" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: N.text }}>{t.subject}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: badgeColor, background: `${badgeColor}10`, padding: "3px 8px", borderRadius: 12, border: `1px solid ${badgeColor}20` }}>
                          {t.status}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: N.muted, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].message : t.message}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: N.muted, fontWeight: 600 }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: N.accent }}>
                          💬 Click to open chat ({msgCount} {msgCount === 1 ? "msg" : "msgs"}) →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
