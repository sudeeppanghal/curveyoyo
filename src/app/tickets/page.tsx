"use client";
import { useState, useEffect } from "react";
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

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
        fetchTickets();
      } else {
        setMsg({ type: "err", text: data.error ?? "Failed to submit ticket." });
      }
    } catch (e) {
      setMsg({ type: "err", text: String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 24, animation: "fadeUp 0.3s ease" }}>
      <style>{`
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Support Helpdesk</h1>
        <p style={{ fontSize: 12, color: N.muted, margin: 0, fontWeight: 600 }}>Submit tickets for order cancellations, billing disputes, or technical support</p>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
              {tickets.map(t => {
                const badgeColor = t.status === "OPEN" ? "#d97706" : t.status === "RESOLVED" ? "#16a34a" : "#718096";
                return (
                  <div key={t.id} style={{ padding: 16, borderRadius: 16, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: N.text }}>{t.subject}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: badgeColor, background: `${badgeColor}10`, padding: "3px 8px", borderRadius: 12, border: `1px solid ${badgeColor}20` }}>
                        {t.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: N.muted, lineHeight: 1.4 }}>{t.message}</p>
                    <span style={{ fontSize: 9, color: N.muted, fontWeight: 600 }}>
                      Submitted {new Date(t.createdAt).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
