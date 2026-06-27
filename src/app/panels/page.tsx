"use client";
import { useState, useEffect } from "react";

const N = {
  bg:       "#111118",
  raised:   "8px 8px 20px rgba(0,0,0,0.65), -4px -4px 12px rgba(255,255,255,0.05)",
  raisedSm: "4px 4px 12px rgba(0,0,0,0.6), -2px -2px 8px rgba(255,255,255,0.04)",
  inset:    "inset 4px 4px 10px rgba(0,0,0,0.6), inset -2px -2px 6px rgba(255,255,255,0.04)",
  accent:   "#F59E0B",
  text:     "#e2e8f0",
  muted:    "#4a5568",
};

type PanelStatus = "ONLINE" | "OFFLINE" | "SLOW" | "UNKNOWN";
interface ServiceIds {
  instagram?: { views?: string; likes?: string; saves?: string; shares?: string; comments?: string };
  tiktok?:    { views?: string; likes?: string; saves?: string; shares?: string; comments?: string };
  youtube?:   { views?: string; likes?: string; saves?: string; shares?: string };
}
interface Panel {
  id: string; name: string; apiUrl: string; priority: number;
  loadPercentage: number; isActive: boolean; status: PanelStatus;
  lastCheckedAt: string | null; lastResponseMs: number | null; successRate: number;
  serviceIds: ServiceIds | null;
}
interface PanelFormData { name: string; apiUrl: string; apiKey: string; priority: number; loadPercentage: number; serviceIds: ServiceIds; }

const STATUS_STYLES: Record<PanelStatus, { color: string; label: string }> = {
  ONLINE:  { color:"#34d399", label:"Online" },
  OFFLINE: { color:"#f87171", label:"Offline" },
  SLOW:    { color:"#F59E0B", label:"Slow" },
  UNKNOWN: { color:"#6b7280", label:"Unknown" },
};
const PLATFORMS = ["instagram", "tiktok", "youtube"] as const;
type Plat = typeof PLATFORMS[number];
const PLAT_ICONS: Record<Plat, string> = { instagram:"📷", tiktok:"🎵", youtube:"▶️" };
const ENGAGEMENT_TYPES: Record<Plat, string[]> = {
  instagram: ["views","likes","saves","shares","comments"],
  tiktok:    ["views","likes","saves","shares","comments"],
  youtube:   ["views","likes","saves","shares"],
};
const TYPE_ICONS: Record<string, string> = { views:"👁", likes:"👍", saves:"🔖", shares:"📤", comments:"💬" };
const DEFAULT_FORM: PanelFormData = { name:"", apiUrl:"", apiKey:"", priority:1, loadPercentage:100, serviceIds:{ instagram:{}, tiktok:{}, youtube:{} } };

function NeoInput({ label, value, onChange, placeholder, type="text" }: { label:string; value:string|number; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", padding:"11px 14px", borderRadius:12, fontSize:13, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"inherit", transition:"box-shadow 0.2s" }}
        className="neo-input" />
    </div>
  );
}

function ServiceIdConfig({ svcIds, onChange }: { svcIds: ServiceIds; onChange:(s:ServiceIds)=>void }) {
  const [openPlat, setOpenPlat] = useState<Plat>("instagram");
  return (
    <div>
      <p style={{ fontSize:12, fontWeight:700, color:N.text, margin:"0 0 12px" }}>
        Service IDs <span style={{ color:N.muted, fontWeight:400 }}>(from your panel's Services list)</span>
      </p>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {PLATFORMS.map(p => (
          <button key={p} onClick={() => setOpenPlat(p)}
            style={{
              padding:"7px 14px", borderRadius:10, fontSize:12, fontWeight:700, border:"none", cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", gap:6, textTransform:"capitalize",
              background: openPlat === p ? "rgba(245,158,11,0.12)" : N.bg,
              color: openPlat === p ? N.accent : N.muted,
              boxShadow: openPlat === p ? N.raisedSm : N.inset,
            }}>
            {PLAT_ICONS[p]} {p}
          </button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {ENGAGEMENT_TYPES[openPlat].map(type => (
          <div key={type}>
            <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:N.muted, marginBottom:6, fontWeight:600 }}>
              <span>{TYPE_ICONS[type]}</span>
              <span style={{ textTransform:"capitalize" }}>{type} ID</span>
            </label>
            <input
              placeholder="e.g. 1234"
              value={(svcIds[openPlat] as Record<string,string> | undefined)?.[type] ?? ""}
              onChange={e => { const updated: ServiceIds = { ...svcIds, [openPlat]: { ...(svcIds[openPlat] ?? {}), [type]: e.target.value } }; onChange(updated); }}
              style={{ width:"100%", padding:"9px 12px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"monospace" }}
              className="neo-input"
            />
          </div>
        ))}
      </div>
      <p style={{ fontSize:11, color:N.muted, marginTop:10 }}>Find IDs: panel dashboard → Services tab → note the number next to each service</p>
    </div>
  );
}

export default function PanelsPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [form, setForm] = useState<PanelFormData>(DEFAULT_FORM);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPanels = async () => {
    const res = await fetch("/api/panels");
    if (res.ok) { const d = await res.json(); setPanels(d.panels ?? []); }
    setLoading(false);
  };
  useEffect(() => { fetchPanels(); }, []);

  const openAdd = () => { setEditPanel(null); setForm(DEFAULT_FORM); setTestResult(null); setError(""); setShowForm(true); };
  const openEdit = (p: Panel) => { setEditPanel(p); setForm({ name:p.name, apiUrl:p.apiUrl, apiKey:"", priority:p.priority, loadPercentage:p.loadPercentage, serviceIds: p.serviceIds ?? { instagram:{}, tiktok:{}, youtube:{} } }); setTestResult(null); setError(""); setShowForm(true); };

  const testConnection = async () => {
    if (!form.apiUrl || !form.apiKey) return;
    setTesting("testing");
    const res = await fetch("/api/panels/test", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ apiUrl:form.apiUrl, apiKey:form.apiKey }) });
    const d = await res.json();
    setTesting(null);
    setTestResult({ ok: res.ok && d.ok, msg: d.balance !== undefined ? `✓ Connected — Balance: $${d.balance}` : d.error ?? "Connection failed" });
  };

  const savePanel = async () => {
    setSaving(true); setError("");
    const res = await fetch(editPanel ? `/api/panels/${editPanel.id}` : "/api/panels", { method: editPanel ? "PATCH" : "POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Save failed"); setSaving(false); return; }
    setSaving(false); setShowForm(false); fetchPanels();
  };

  const deletePanel = async (id: string) => {
    if (!confirm("Remove this panel?")) return;
    await fetch(`/api/panels/${id}`, { method:"DELETE" });
    fetchPanels();
  };

  return (
    <div style={{ maxWidth:860, display:"flex", flexDirection:"column", gap:24 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .neo-input:focus{box-shadow:inset 5px 5px 14px rgba(0,0,0,0.7),inset -3px -3px 8px rgba(255,255,255,0.05),0 0 0 2px rgba(245,158,11,0.25) !important}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px rgba(0,0,0,0.7),-4px -4px 12px rgba(255,255,255,0.07) !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px rgba(0,0,0,0.6),inset -1px -1px 4px rgba(255,255,255,0.04) !important}
        .panel-card:hover{box-shadow:10px 10px 24px rgba(0,0,0,0.7),-5px -5px 14px rgba(255,255,255,0.06) !important}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-0.5px" }}>SMM Panels</h1>
          <p style={{ fontSize:13, color:N.muted, margin:0 }}>Connect providers — we handle routing, failover & engagement</p>
        </div>
        <button onClick={openAdd} className="neo-btn"
          style={{ padding:"10px 20px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", cursor:"pointer", color:"#08080c", background:"linear-gradient(135deg,#F59E0B,#F97316)", boxShadow:"6px 6px 16px rgba(0,0,0,0.6),-3px -3px 10px rgba(255,255,255,0.07)", transition:"all 0.2s" }}>
          + Add Panel
        </button>
      </div>

      {/* Panel list */}
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"80px 0" }}>
          <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(245,158,11,0.15)", borderTopColor:N.accent, animation:"spin 0.8s linear infinite" }} />
        </div>
      ) : panels.length === 0 ? (
        <div style={{ borderRadius:20, padding:"64px 24px", background:N.bg, boxShadow:N.raised, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:40, marginBottom:4 }}>🔌</div>
          <p style={{ fontSize:15, fontWeight:800, color:N.text, margin:0 }}>No panels connected</p>
          <p style={{ fontSize:13, color:N.muted, margin:0 }}>Connect your first SMM panel to start delivering views + engagement</p>
          <button onClick={openAdd} style={{ marginTop:8, padding:"11px 24px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", cursor:"pointer", color:"#08080c", background:"linear-gradient(135deg,#F59E0B,#F97316)", boxShadow:N.raisedSm }}>
            Add First Panel →
          </button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {panels.map((p, idx) => {
            const st = STATUS_STYLES[p.status];
            const hasServiceIds = p.serviceIds && Object.values(p.serviceIds).some(plat => Object.values(plat ?? {}).some(Boolean));
            return (
              <div key={p.id} className="panel-card"
                style={{ borderRadius:20, padding:"20px 22px", background:N.bg, boxShadow:N.raised, display:"flex", alignItems:"flex-start", gap:16, transition:"all 0.2s", animation:`fadeUp ${0.1 + idx * 0.07}s ease` }}>
                {/* Priority circle */}
                <div style={{ width:40, height:40, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color: idx === 0 ? "#08080c" : N.muted, background: idx === 0 ? "linear-gradient(135deg,#F59E0B,#F97316)" : N.bg, boxShadow: idx === 0 ? "4px 4px 12px rgba(0,0,0,0.6),-2px -2px 6px rgba(255,255,255,0.06)" : N.inset }}>
                  {p.priority}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <p style={{ fontWeight:800, fontSize:14, color:N.text, margin:0 }}>{p.name}</p>
                    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, color:st.color, background:N.bg, boxShadow:N.inset }}>
                      {st.label}
                    </span>
                    {!p.isActive && <span style={{ fontSize:11, color:N.muted, background:N.bg, padding:"3px 8px", borderRadius:20, boxShadow:N.inset }}>Paused</span>}
                  </div>
                  <p style={{ fontSize:12, color:N.muted, margin:"0 0 10px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.apiUrl}</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:12, fontSize:11 }}>
                    <span style={{ color:N.muted }}>Priority: <span style={{ color:N.text, fontWeight:700 }}>{p.priority}</span></span>
                    <span style={{ color:N.muted }}>Load: <span style={{ color:N.text, fontWeight:700 }}>{p.loadPercentage}%</span></span>
                    {p.lastResponseMs && <span style={{ color:N.muted }}>Response: <span style={{ color: p.lastResponseMs > 5000 ? "#F59E0B" : "#34d399", fontWeight:700 }}>{p.lastResponseMs}ms</span></span>}
                    <span>{hasServiceIds ? <span style={{ color:"#34d399", fontWeight:700 }}>✓ IDs set</span> : <span style={{ color:"#F59E0B", fontWeight:700 }}>⚠ No service IDs</span>}</span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <button onClick={() => openEdit(p)} style={{ padding:"8px 16px", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", border:"none", color:N.text, background:N.bg, boxShadow:N.raisedSm, transition:"all 0.15s" }}>Edit</button>
                  <button onClick={() => deletePanel(p.id)} style={{ padding:"8px 16px", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", border:"none", color:"#f87171", background:N.bg, boxShadow:N.raisedSm, transition:"all 0.15s" }}>Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How-to tip */}
      <div style={{ borderRadius:16, padding:"16px 20px", background:N.bg, boxShadow:N.inset, display:"flex", flexDirection:"column", gap:5 }}>
        <p style={{ fontSize:12, fontWeight:800, color:N.text, margin:0 }}>💡 How to find Service IDs</p>
        {["1. Log into your SMM panel (e.g. SMMKings, Peakerr, JustAnotherPanel)", "2. Go to Services tab → search Instagram Reels Views → note the ID (e.g. 1234)", "3. Do the same for Likes, Saves, Shares, Comments — enter each above", "4. Panel priority 1 = primary, 2 = first failover (failover is automatic, sub-1s)"].map((t, i) => (
          <p key={i} style={{ fontSize:12, color:N.muted, margin:0 }}>{t}</p>
        ))}
      </div>

      {/* Add/Edit Drawer */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }}>
          <div style={{ width:"100%", maxWidth:680, borderRadius:24, background:N.bg, boxShadow:"16px 16px 40px rgba(0,0,0,0.8),-8px -8px 24px rgba(255,255,255,0.04)", maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {/* Drawer header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", boxShadow:"0 4px 20px rgba(0,0,0,0.4)" }}>
              <h2 style={{ fontSize:16, fontWeight:800, color:N.text, margin:0 }}>{editPanel ? "Edit Panel" : "Add Panel"}</h2>
              <button onClick={() => setShowForm(false)} style={{ width:32, height:32, borderRadius:10, border:"none", cursor:"pointer", background:N.bg, boxShadow:N.raisedSm, color:N.muted, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>×</button>
            </div>

            {/* Drawer body */}
            <div style={{ flex:1, overflowY:"auto", padding:"24px", display:"flex", flexDirection:"column", gap:20 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <NeoInput label="Panel Name" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="e.g. SMMKings Primary"/>
                <NeoInput label="API URL" value={form.apiUrl} onChange={v=>setForm(f=>({...f,apiUrl:v}))} placeholder="https://panel.com/api/v2"/>
              </div>

              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  API Key {editPanel && <span style={{ color:N.muted, textTransform:"none", fontWeight:400 }}>(leave blank to keep current)</span>}
                </label>
                <div style={{ display:"flex", gap:10 }}>
                  <input type="password" value={form.apiKey} onChange={e=>setForm(f=>({...f,apiKey:e.target.value}))} placeholder={editPanel ? "••••••••" : "Paste your API key"}
                    style={{ flex:1, padding:"11px 14px", borderRadius:12, fontSize:13, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"monospace" }}
                    className="neo-input"/>
                  <button onClick={testConnection} disabled={!form.apiUrl || (!form.apiKey && !editPanel) || testing === "testing"} className="neo-btn"
                    style={{ padding:"11px 20px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.text, background:N.bg, boxShadow:N.raisedSm, transition:"all 0.2s", opacity: (!form.apiUrl || (!form.apiKey && !editPanel)) ? 0.4 : 1 }}>
                    {testing === "testing" ? "Testing…" : "Test"}
                  </button>
                </div>
                {testResult && (
                  <p style={{ marginTop:8, fontSize:12, fontWeight:700, color: testResult.ok ? "#34d399" : "#f87171" }}>{testResult.msg}</p>
                )}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <NeoInput label="Priority (1 = primary)" type="number" value={form.priority} onChange={v=>setForm(f=>({...f,priority:parseInt(v)||1}))}/>
                <NeoInput label="Load % (100 = all traffic)" type="number" value={form.loadPercentage} onChange={v=>setForm(f=>({...f,loadPercentage:parseInt(v)||100}))}/>
              </div>

              <div style={{ borderRadius:16, padding:"20px", background:N.bg, boxShadow:N.inset }}>
                <ServiceIdConfig svcIds={form.serviceIds} onChange={s=>setForm(f=>({...f,serviceIds:s}))}/>
              </div>

              {error && <p style={{ fontSize:13, color:"#f87171", margin:0 }}>{error}</p>}
            </div>

            {/* Drawer footer */}
            <div style={{ display:"flex", gap:12, padding:"16px 24px", boxShadow:"0 -4px 20px rgba(0,0,0,0.4)" }}>
              <button onClick={() => setShowForm(false)} style={{ flex:1, padding:"12px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }}>Cancel</button>
              <button onClick={savePanel} disabled={saving || !form.name || !form.apiUrl} className="neo-btn"
                style={{ flex:1, padding:"12px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", cursor:"pointer", color:"#08080c", background:"linear-gradient(135deg,#F59E0B,#F97316)", boxShadow:"6px 6px 16px rgba(0,0,0,0.6),-3px -3px 10px rgba(255,255,255,0.07)", transition:"all 0.2s", opacity: (saving || !form.name || !form.apiUrl) ? 0.5 : 1 }}>
                {saving ? "Saving…" : editPanel ? "Save Changes" : "Add Panel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
