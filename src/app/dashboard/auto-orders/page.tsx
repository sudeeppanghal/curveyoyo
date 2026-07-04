"use client";
import { useState, useEffect, useMemo } from "react";
import { generateRawSchedule } from "@/lib/delivery/curve";
import { STYLE_NEON_COLORS_100 as STYLE_NEON_COLORS } from "@/lib/delivery/curve-styles-100";
import { motion, AnimatePresence } from "framer-motion";

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
        <motion.path 
          d={fillD} 
          fill={`url(#${gradId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.path
          d={pathD}
          fill="none"
          stroke={neon.stroke}
          strokeWidth={active ? "2.5" : "2"}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          style={{ filter: active ? `drop-shadow(0 0 6px ${neon.stroke})` : `none` }}
        />
      </svg>
  );
}

export default function AutoOrdersPage() {
  const [step, setStep] = useState(1);
  const [subs, setSubs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    username: "",
    platform: "INSTAGRAM",
    templateIds: [] as string[],
    viewsMin: 1000,
    viewsMax: 5000,
    likesMin: 100, likesMax: 500,
    commentsMin: 5, commentsMax: 20,
    sharesMin: 10, sharesMax: 50,
    savesMin: 20, savesMax: 100,
    repostsMin: 0, repostsMax: 0,
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
    if (step < 5) {
      setStep(step + 1);
      return;
    }

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
        setStep(1);
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

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: N.text, marginBottom: 8 }}>AI Organic Automation 🚀</h1>
      <p style={{ color: N.muted, marginBottom: 32, fontSize: 15 }}>
        Automatically track your social media profiles and deliver completely organic-looking, randomized engagement every time you post a new Reel or Video.
      </p>

      {/* CREATE FORM WIZARD */}
      <div style={{ background: N.surface, boxShadow: N.raised, borderRadius: 24, padding: 36, marginBottom: 40, minHeight: 450, display: 'flex', flexDirection: 'column' }}>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 14, left: 0, right: 0, height: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 2, zIndex: 0 }}>
            <motion.div 
              initial={false}
              animate={{ width: `${((step - 1) / 4) * 100}%` }}
              style={{ height: '100%', background: N.accentBg, borderRadius: 2 }}
            />
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} onClick={() => i < step && setStep(i)} style={{ zIndex: 1, width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: step >= i ? N.accent : N.bg, boxShadow: step >= i ? '0 4px 10px rgba(217, 119, 6, 0.3)' : N.raisedSm, color: step >= i ? '#fff' : N.muted, fontWeight: 800, fontSize: 14, cursor: i < step ? 'pointer' : 'default', transition: 'all 0.3s' }}>
              {i}
            </div>
          ))}
        </div>

        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: N.text, marginBottom: 8 }}>Step 1: Profile Details</h2>
                <p style={{ color: N.muted, fontSize: 14, marginBottom: 24 }}>Select the platform and enter the exact username/handle you want to automate.</p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: N.muted, marginBottom: 8, textTransform: "uppercase" }}>Platform</label>
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
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: N.muted, marginBottom: 8, textTransform: "uppercase" }}>Username / Handle</label>
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
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: N.text, marginBottom: 8 }}>Step 2: Randomized Views</h2>
                <p style={{ color: N.muted, fontSize: 14, marginBottom: 24 }}>Set a minimum and maximum limit. Every time you post, we will send a random number of views within this range so it looks 100% natural.</p>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8, textTransform: "uppercase" }}>Minimum Views</label>
                    <input 
                      type="number" 
                      value={form.viewsMin}
                      onChange={e => setForm({...form, viewsMin: parseInt(e.target.value) || 0})}
                      min="1000"
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
                      min="1000"
                      max="1000000"
                      required
                      style={{ width: "100%", padding: "16px 20px", borderRadius: 16, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 15 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: N.text, marginBottom: 8 }}>Step 3: Engagement Metrics</h2>
                <p style={{ color: N.muted, fontSize: 14, marginBottom: 24 }}>Set exact Min/Max limits for Likes, Comments, Shares, and Saves.</p>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Likes */}
                  <div style={{ background: "rgba(0,0,0,0.02)", padding: 16, borderRadius: 12 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: N.text, marginBottom: 12 }}>❤️ Likes</label>
                    <div style={{ display: "flex", gap: 12 }}>
                      <input type="number" placeholder="Min" value={form.likesMin} onChange={e => setForm({...form, likesMin: parseInt(e.target.value)||0})} style={{ width: "50%", padding: "12px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 14 }} />
                      <input type="number" placeholder="Max" value={form.likesMax} onChange={e => setForm({...form, likesMax: parseInt(e.target.value)||0})} style={{ width: "50%", padding: "12px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 14 }} />
                    </div>
                  </div>
                  {/* Comments */}
                  <div style={{ background: "rgba(0,0,0,0.02)", padding: 16, borderRadius: 12 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: N.text, marginBottom: 12 }}>💬 Comments</label>
                    <div style={{ display: "flex", gap: 12 }}>
                      <input type="number" placeholder="Min" value={form.commentsMin} onChange={e => setForm({...form, commentsMin: parseInt(e.target.value)||0})} style={{ width: "50%", padding: "12px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 14 }} />
                      <input type="number" placeholder="Max" value={form.commentsMax} onChange={e => setForm({...form, commentsMax: parseInt(e.target.value)||0})} style={{ width: "50%", padding: "12px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 14 }} />
                    </div>
                  </div>
                  {/* Shares */}
                  <div style={{ background: "rgba(0,0,0,0.02)", padding: 16, borderRadius: 12 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: N.text, marginBottom: 12 }}>🚀 Shares</label>
                    <div style={{ display: "flex", gap: 12 }}>
                      <input type="number" placeholder="Min" value={form.sharesMin} onChange={e => setForm({...form, sharesMin: parseInt(e.target.value)||0})} style={{ width: "50%", padding: "12px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 14 }} />
                      <input type="number" placeholder="Max" value={form.sharesMax} onChange={e => setForm({...form, sharesMax: parseInt(e.target.value)||0})} style={{ width: "50%", padding: "12px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 14 }} />
                    </div>
                  </div>
                  {/* Saves */}
                  <div style={{ background: "rgba(0,0,0,0.02)", padding: 16, borderRadius: 12 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: N.text, marginBottom: 12 }}>🔖 Saves</label>
                    <div style={{ display: "flex", gap: 12 }}>
                      <input type="number" placeholder="Min" value={form.savesMin} onChange={e => setForm({...form, savesMin: parseInt(e.target.value)||0})} style={{ width: "50%", padding: "12px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 14 }} />
                      <input type="number" placeholder="Max" value={form.savesMax} onChange={e => setForm({...form, savesMax: parseInt(e.target.value)||0})} style={{ width: "50%", padding: "12px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", color: N.text, fontWeight: 800, fontSize: 14 }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: N.text, margin: 0 }}>Step 4: AI Pacing Graphs</h2>
                  <button type="button" onClick={handleQuickTemplate} style={{ fontSize: 12, fontWeight: 800, color: N.accent, background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, backgroundColor: "rgba(217, 119, 6, 0.1)" }}>+ Add Graph</button>
                </div>
                <p style={{ color: N.muted, fontSize: 14, marginBottom: 24 }}>Select multiple graphs. The AI will randomly select one for each new post so no two posts look exactly the same.</p>
                
                {templates.length === 0 && (
                  <div style={{ padding: 20, background: "rgba(217, 119, 6, 0.1)", borderRadius: 12, marginBottom: 24, textAlign: 'center' }}>
                    <p style={{ color: N.accent, fontWeight: 800, margin: "0 0 12px 0" }}>You don't have any AI templates yet.</p>
                    <button type="button" onClick={handleQuickTemplate} style={{ padding: "12px 20px", background: N.accentBg, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>Create Default AI Template</button>
                  </div>
                )}

                {templates.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {templates.map(t => {
                      const isSelected = form.templateIds.includes(t.id);
                      return (
                        <div 
                          key={t.id} 
                          onClick={() => toggleTemplate(t.id)}
                          style={{ 
                            padding: "16px 20px", borderRadius: 16, 
                            background: isSelected ? "#3b0764" : N.surface, 
                            boxShadow: isSelected ? "0 8px 25px rgba(107, 33, 168, 0.4)" : N.raisedSm,
                            color: isSelected ? "#f3e8ff" : N.text,
                            fontWeight: 700, fontSize: 14, cursor: "pointer",
                            border: isSelected ? "2px solid #a855f7" : `2px solid transparent`,
                            transition: "all 0.2s", width: "180px", display: "flex", flexDirection: "column", gap: 8
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
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: N.text, marginBottom: 8 }}>Step 5: Review & Start</h2>
                <p style={{ color: N.muted, fontSize: 14, marginBottom: 24 }}>Review your automation settings before starting.</p>
                
                <div style={{ background: "rgba(0,0,0,0.02)", padding: 24, borderRadius: 16, marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ color: N.muted, fontWeight: 700 }}>Platform / Account:</span>
                    <span style={{ color: N.text, fontWeight: 800 }}>{form.platform} - @{form.username}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ color: N.muted, fontWeight: 700 }}>Random Views:</span>
                    <span style={{ color: N.text, fontWeight: 800 }}>{form.viewsMin.toLocaleString()} to {form.viewsMax.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ color: N.muted, fontWeight: 700 }}>Total Graphs Selected:</span>
                    <span style={{ color: N.text, fontWeight: 800 }}>{form.templateIds.length} Graphs</span>
                  </div>
                </div>

                <div style={{ background: "#fff5f5", borderLeft: "5px solid #fc8181", padding: "16px 20px", borderRadius: "0 12px 12px 0", marginBottom: 32, boxShadow: "0 4px 10px rgba(229, 62, 62, 0.1)" }}>
                  <h4 style={{ color: "#c53030", margin: "0 0 6px 0", fontSize: 15, fontWeight: 800 }}>⚠️ Important: Keep Balance Available</h4>
                  <p style={{ color: "#c53030", margin: 0, fontSize: 13, fontWeight: 600 }}>
                    Please deposit balance if your balance is low for flawless automation. When you post a new video, the system will auto-deduct the balance based on the randomized views/engagement. If balance is insufficient, the system will skip your post.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', gap: 16 }}>
            {step > 1 && (
              <button 
                type="button"
                onClick={() => setStep(step - 1)}
                style={{ padding: "18px 24px", borderRadius: 16, border: "none", background: N.bg, boxShadow: N.raisedSm, color: N.text, fontWeight: 800, fontSize: 16, cursor: "pointer", transition: "all 0.2s" }}
              >
                Back
              </button>
            )}
            <button 
              type="submit"
              style={{
                flex: 1, padding: "18px", borderRadius: 16, border: "none",
                background: N.accentBg, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer",
                boxShadow: "0 8px 25px rgba(217, 119, 6, 0.4)", transition: "transform 0.2s, box-shadow 0.2s"
              }}
            >
              {step === 5 ? "Start Now 🔥" : "Next Step ➔"}
            </button>
          </div>
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
                style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: N.bg, boxShadow: N.raisedSm, color: "#dc2626", fontWeight: 800, fontSize: 13, cursor: "pointer", transition: "background 0.2s" }}
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
