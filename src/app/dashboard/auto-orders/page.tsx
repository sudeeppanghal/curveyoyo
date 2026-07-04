"use client";
import { useState, useEffect, useMemo } from "react";
import { generateRawSchedule } from "@/lib/delivery/curve";
import { STYLE_NEON_COLORS_100 as STYLE_NEON_COLORS } from "@/lib/delivery/curve-styles-100";

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

// ── Mini Sparkline Curve Chart ──────────────────────────────────
function MiniCurveChart({ template, active }: { template: any; active: boolean }) {
  const points = useMemo(() => {
    if (template.customSchedule && Array.isArray(template.customSchedule) && template.customSchedule.length > 0) {
      // Sort and plot custom dots
      const sorted = [...template.customSchedule].sort((a, b) => (a.hour || 0) - (b.hour || 0));
      return sorted.map((b) => b.views);
    }
    const batches = generateRawSchedule({
      totalViews: 10000,
      durationHours: template.durationHours || 24,
      warmupHours: template.warmupHours || 4,
      peakHours: template.peakHours || 8,
      style: template.style as any,
      engagementEnabled: false,
      tzOffsetHours: 0,
    });
    return batches.map((b) => b.views);
  }, [template]);

  const maxVal = Math.max(...points, 1);
  const width = 100;
  const height = 40;
  const padding = 2;

  const pathD = points
    .map((v: number, i: number) => {
      const x = padding + (i / Math.max(1, points.length - 1)) * (width - 2 * padding);
      const y = height - padding - (v / maxVal) * (height - 2 * padding);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const fillD = `${pathD} L ${width - padding} ${height} L ${padding} ${height} Z`;

  const neon = STYLE_NEON_COLORS[template.style as keyof typeof STYLE_NEON_COLORS] || STYLE_NEON_COLORS.ORGANIC || { stroke: "#d946ef" };
  const gradId = `mini-grad-${template.id}`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block", width: "100%", margin: "8px 0" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={neon.stroke} stopOpacity={active ? "0.45" : "0.20"} />
          <stop offset="100%" stopColor={neon.stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={neon.stroke}
        strokeWidth={active ? "2.5" : "2"}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: active ? `drop-shadow(0 0 6px ${neon.stroke})` : `none`, transition: "all 0.25s ease" }}
      />
    </svg>
  );
}

export default function AutoOrdersPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    username: "",
    platform: "INSTAGRAM",
    templateIds: [] as string[],
    viewsMin: 1000,
    viewsMax: 5000,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [subsRes, tempRes] = await Promise.all([
        fetch("/api/auto-orders"),
        fetch("/api/templates")
      ]);
      if (subsRes.ok) {
        const { autoOrders } = await subsRes.json();
        setSubs(autoOrders);
      }
      if (tempRes.ok) {
        const { templates: curveTemplates } = await tempRes.json();
        setTemplates(curveTemplates);
        if (curveTemplates.length > 0 && form.templateIds.length === 0) {
          setForm(prev => ({ ...prev, templateIds: [curveTemplates[0].id] }));
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
    if (!form.username || form.templateIds.length === 0) return alert("Username and at least one Template are required.");
    if (form.viewsMin >= form.viewsMax) return alert("Maximum views must be greater than Minimum views.");
    
    try {
      const res = await fetch("/api/auto-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert("Auto-Order Tracker Created! We will now automatically send organic engagement to your new posts.");
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
    if (!confirm("Are you sure you want to stop tracking this account?")) return;
    try {
      const res = await fetch(`/api/auto-orders/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSubs(subs.filter(s => s.id !== id));
      }
    } catch (err) {
      alert("Failed to delete");
    }
  }

  async function handleQuickTemplate() {
    setLoading(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Organic Burst " + Math.floor(Math.random() * 1000),
          style: "SLOW_START",
          durationHours: 12,
          warmupHours: 2,
          peakHours: 4,
          decayHours: 6,
          likesRatioPct: 4.0,
          savesRatioPct: 2.0,
          sharesRatioPct: 0.5,
          commentsRatioPct: 0.2
        })
      });
      if (res.ok) {
        alert("New Organic Burst Template created successfully! It is now available to select.");
        fetchData();
      } else {
        const err = await res.json();
        alert("Failed to create template: " + err.error);
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  const toggleTemplate = (id: string) => {
    setForm(prev => {
      const selected = prev.templateIds.includes(id) 
        ? prev.templateIds.filter(t => t !== id)
        : [...prev.templateIds, id];
      return { ...prev, templateIds: selected };
    });
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: N.text, marginBottom: 8 }}>AI Organic Automation 🚀</h1>
      <p style={{ color: N.muted, marginBottom: 32, fontSize: 15 }}>
        Automatically track your social media profiles and deliver completely organic-looking, randomized engagement every time you post a new Reel or Video.
      </p>

      {/* WARNING BANNER */}
      <div style={{ background: "#fff5f5", borderLeft: "5px solid #fc8181", padding: "16px 20px", borderRadius: "0 12px 12px 0", marginBottom: 32, boxShadow: "0 4px 10px rgba(229, 62, 62, 0.1)" }}>
        <h4 style={{ color: "#c53030", margin: "0 0 6px 0", fontSize: 15, fontWeight: 800 }}>⚠️ Important Balance Warning</h4>
        <p style={{ color: "#c53030", margin: 0, fontSize: 13, fontWeight: 600 }}>
          Make sure you maintain sufficient wallet balance at all times. If your balance drops below the required amount when you post a new video, the auto-order will fail and will not be retried.
        </p>
      </div>

      {/* CREATE FORM */}
      <div style={{ background: N.surface, boxShadow: N.raised, borderRadius: 24, padding: 36, marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: N.text, marginBottom: 24 }}>Add Profile Tracker</h2>
        
        {templates.length === 0 && (
          <div style={{ padding: 20, background: "rgba(217, 119, 6, 0.1)", borderRadius: 12, marginBottom: 24 }}>
            <p style={{ color: N.accent, fontWeight: 800, margin: "0 0 12px 0" }}>
              Our AI requires a pacing curve template to define how fast engagements arrive. Let's create one!
            </p>
            <button
              type="button"
              onClick={handleQuickTemplate}
              style={{ padding: "12px 20px", background: N.accentBg, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 15px rgba(217, 119, 6, 0.3)" }}
            >
              Create Default AI Template
            </button>
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* PROFILE SELECTION */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: N.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Platform</label>
              <select 
                value={form.platform}
                onChange={e => setForm({...form, platform: e.target.value})}
                style={{ width: "100%", padding: "16px 20px", borderRadius: 16, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 700, fontSize: 15 }}
              >
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
                <option value="FACEBOOK">Facebook</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: N.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Username / Handle</label>
              <input 
                type="text" 
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
                placeholder="e.g. zuck"
                required
                style={{ width: "100%", padding: "16px 20px", borderRadius: 16, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 700, fontSize: 15 }}
              />
            </div>
          </div>

          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent)` }} />

          {/* VIEWS RANDOMIZATION */}
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 800, color: N.text, marginBottom: 8 }}>Randomized Engagement Range (Looks Organic)</label>
            <p style={{ color: N.muted, fontSize: 12, marginBottom: 16, fontWeight: 600 }}>Set a lower and upper limit. Every new reel will receive a randomized number of views and engagements within this range.</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8, textTransform: "uppercase" }}>Minimum Views</label>
                <input 
                  type="number" 
                  value={form.viewsMin}
                  onChange={e => setForm({...form, viewsMin: parseInt(e.target.value) || 0})}
                  min="500"
                  required
                  style={{ width: "100%", padding: "16px 20px", borderRadius: 16, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 15 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8, textTransform: "uppercase" }}>Maximum Views</label>
                <input 
                  type="number" 
                  value={form.viewsMax}
                  onChange={e => setForm({...form, viewsMax: parseInt(e.target.value) || 0})}
                  min="500"
                  required
                  style={{ width: "100%", padding: "16px 20px", borderRadius: 16, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 15 }}
                />
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent)` }} />

          {/* TEMPLATE MULTI-SELECT */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 800, color: N.text }}>AI Pacing Graphs</label>
              <button type="button" onClick={handleQuickTemplate} style={{ fontSize: 12, fontWeight: 800, color: N.accent, background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, backgroundColor: "rgba(217, 119, 6, 0.1)" }}>+ Add New Graph</button>
            </div>
            <p style={{ color: N.muted, fontSize: 12, marginBottom: 16, fontWeight: 600 }}>Select multiple graphs! The AI will randomly pick one of your selected graphs for every new post to ensure no two posts look exactly the same.</p>
            
            {templates.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {templates.map(t => {
                  const isSelected = form.templateIds.includes(t.id);
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => toggleTemplate(t.id)}
                      style={{ 
                        padding: "16px 20px", 
                        borderRadius: 16, 
                        background: isSelected ? "#3b0764" : N.surface, 
                        boxShadow: isSelected ? "0 8px 25px rgba(107, 33, 168, 0.4)" : N.raisedSm,
                        color: isSelected ? "#f3e8ff" : N.text,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        border: isSelected ? "2px solid #a855f7" : `2px solid transparent`,
                        transition: "all 0.2s",
                        width: "180px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>{t.name}</span>
                        <span style={{ opacity: isSelected ? 0.9 : 0.6, fontSize: 11, fontWeight: 800 }}>{t.style}</span>
                      </div>
                      <div style={{ background: isSelected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)", borderRadius: 8, padding: 8, marginTop: 4 }}>
                        <MiniCurveChart template={t} active={isSelected} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={templates.length === 0}
            style={{
              marginTop: 16,
              padding: "18px",
              borderRadius: 16,
              border: "none",
              background: templates.length === 0 ? N.faint : N.accentBg,
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              cursor: templates.length === 0 ? "not-allowed" : "pointer",
              boxShadow: templates.length === 0 ? "none" : "0 8px 25px rgba(217, 119, 6, 0.4)",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
          >
            Start Tracking & Automating 🔥
          </button>
        </form>
      </div>

      {/* LIST */}
      <h2 style={{ fontSize: 20, fontWeight: 800, color: N.text, marginBottom: 20 }}>Your Active Trackers</h2>
      
      {loading ? <p style={{ color: N.muted, fontWeight: 600 }}>Loading trackers...</p> : subs.length === 0 ? (
        <p style={{ color: N.muted, fontWeight: 600 }}>You don't have any auto-orders set up yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          {subs.map(sub => (
            <div key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: N.surface, boxShadow: N.raised, borderRadius: 24, padding: "24px 32px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: N.text, margin: 0 }}>@{sub.username}</h3>
                  <span style={{ 
                    fontSize: 10, fontWeight: 800, padding: "6px 10px", borderRadius: 8, textTransform: "uppercase",
                    background: sub.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                    color: sub.status === "ACTIVE" ? "#166534" : "#991b1b"
                  }}>
                    {sub.status}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: N.muted, background: "rgba(0,0,0,0.05)", padding: "6px 10px", borderRadius: 8 }}>
                    {sub.platform}
                  </span>
                </div>
                
                <div style={{ display: "flex", gap: 24 }}>
                  <div>
                    <p style={{ fontSize: 11, color: N.muted, fontWeight: 700, margin: "0 0 4px 0", textTransform: "uppercase" }}>Random Views</p>
                    <p style={{ fontSize: 14, color: N.text, fontWeight: 800, margin: 0 }}>
                      {sub.viewsMin?.toLocaleString()} - {sub.viewsMax?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: N.muted, fontWeight: 700, margin: "0 0 4px 0", textTransform: "uppercase" }}>AI Graphs Selected</p>
                    <p style={{ fontSize: 14, color: N.text, fontWeight: 800, margin: 0 }}>
                      {sub.templateIds?.length || 1} {sub.templateIds?.length === 1 ? 'Graph' : 'Graphs'}
                    </p>
                  </div>
                </div>

                {sub.lastPostId && (
                  <p style={{ fontSize: 12, color: N.accent, fontWeight: 700, marginTop: 12, margin: "12px 0 0 0" }}>
                    Last tracked post: {sub.lastPostId}
                  </p>
                )}
              </div>

              <button 
                onClick={() => handleDelete(sub.id)}
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: "none",
                  background: N.bg,
                  boxShadow: N.raisedSm,
                  color: "#dc2626",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.background = "#fee2e2"}
                onMouseOut={e => e.currentTarget.style.background = N.bg}
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
