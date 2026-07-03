"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const N = {
  bg:        "#eef2f7",
  surface:   "#eef2f7",
  raised:    "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm:  "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:     "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:    "#d97706",
  accentBg:  "linear-gradient(135deg, #d97706, #ea580c)",
  text:      "#2d3748",
  muted:     "#718096",
  faint:     "#a0aec0",
};

export default function AutoOrdersPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    username: "",
    platform: "INSTAGRAM",
    templateId: "",
    viewsTarget: 1000
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [subsRes, tempRes] = await Promise.all([
        fetch("/api/auto-orders"),
        fetch("/api/curve-templates")
      ]);
      if (subsRes.ok) {
        const { autoOrders } = await subsRes.json();
        setSubs(autoOrders);
      }
      if (tempRes.ok) {
        const { curveTemplates } = await tempRes.json();
        setTemplates(curveTemplates);
        if (curveTemplates.length > 0) {
          setForm(prev => ({ ...prev, templateId: curveTemplates[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.templateId) return alert("Username and Template required");
    
    try {
      const res = await fetch("/api/auto-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert("Auto-Order Subscription Created!");
        setForm({ ...form, username: "" });
        fetchData();
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Network error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this auto-order?")) return;
    try {
      const res = await fetch(`/api/auto-orders/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSubs(subs.filter(s => s.id !== id));
      }
    } catch (err) {
      alert("Failed to delete");
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: N.text, marginBottom: 8 }}>Auto-Orders 🚀</h1>
      <p style={{ color: N.muted, marginBottom: 32 }}>Automatically place engagement orders whenever you post a new Reel or TikTok.</p>

      {/* CREATE FORM */}
      <div style={{ background: N.surface, boxShadow: N.raised, borderRadius: 20, padding: 32, marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: N.text, marginBottom: 20 }}>Create New Auto-Order</h2>
        
        {templates.length === 0 ? (
          <p style={{ color: "red", fontWeight: "bold" }}>You must create a Curve Template first on the Reels page before using Auto-Orders.</p>
        ) : (
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: N.muted, marginBottom: 8 }}>Platform</label>
                <select 
                  value={form.platform}
                  onChange={e => setForm({...form, platform: e.target.value})}
                  style={{ width: "100%", padding: "14px 20px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 600 }}
                >
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="FACEBOOK">Facebook</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: N.muted, marginBottom: 8 }}>Username / Handle</label>
                <input 
                  type="text" 
                  value={form.username}
                  onChange={e => setForm({...form, username: e.target.value})}
                  placeholder="e.g. zuck"
                  required
                  style={{ width: "100%", padding: "14px 20px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: N.muted, marginBottom: 8 }}>Target Views per Post</label>
                <input 
                  type="number" 
                  value={form.viewsTarget}
                  onChange={e => setForm({...form, viewsTarget: parseInt(e.target.value) || 0})}
                  min="100"
                  required
                  style={{ width: "100%", padding: "14px 20px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: N.muted, marginBottom: 8 }}>Engagement Template</label>
                <select 
                  value={form.templateId}
                  onChange={e => setForm({...form, templateId: e.target.value})}
                  style={{ width: "100%", padding: "14px 20px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 600 }}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.style})</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              type="submit"
              style={{
                marginTop: 10,
                padding: "16px",
                borderRadius: 12,
                border: "none",
                background: N.accentBg,
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(217, 119, 6, 0.4)"
              }}
            >
              Start Auto-Ordering
            </button>
          </form>
        )}
      </div>

      {/* LIST */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: N.text, marginBottom: 20 }}>Your Active Trackers</h2>
      
      {loading ? <p>Loading...</p> : subs.length === 0 ? (
        <p style={{ color: N.muted }}>You don't have any auto-orders set up yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {subs.map(sub => (
            <div key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: N.surface, boxShadow: N.raised, borderRadius: 20, padding: 24 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: N.text }}>@{sub.username}</h3>
                  <span style={{ 
                    fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 8,
                    background: sub.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                    color: sub.status === "ACTIVE" ? "#166534" : "#991b1b"
                  }}>
                    {sub.status}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: N.muted, background: "rgba(0,0,0,0.05)", padding: "4px 8px", borderRadius: 8 }}>
                    {sub.platform}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: N.muted, fontWeight: 600, margin: 0 }}>
                  Target: <strong style={{ color: N.text }}>{sub.viewsTarget} Views</strong> • 
                  Template: <strong style={{ color: N.text }}>{sub.template?.name}</strong>
                </p>
                {sub.lastPostId && (
                  <p style={{ fontSize: 12, color: N.faint, marginTop: 6, margin: 0 }}>
                    Last scanned post: {sub.lastPostId}
                  </p>
                )}
              </div>

              <button 
                onClick={() => handleDelete(sub.id)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: N.bg,
                  boxShadow: N.raisedSm,
                  color: "#dc2626",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Delete Tracker
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
