"use client";
import { useState, useEffect } from "react";
import { N } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";



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
  balance?: number;
  currency?: string;
}
interface PanelFormData { name: string; apiUrl: string; apiKey: string; priority: number; loadPercentage: number; serviceIds: ServiceIds; }

const STATUS_STYLES: Record<PanelStatus, { color: string; label: string }> = {
  ONLINE:  { color:"#16a34a", label:"Online" },
  OFFLINE: { color:"#dc2626", label:"Offline" },
  SLOW:    { color:"#d97706", label:"Slow" },
  UNKNOWN: { color:"#4b5563", label:"Unknown" },
};
const PLATFORMS = ["instagram", "tiktok", "youtube"] as const;
type Plat = typeof PLATFORMS[number];
const PLAT_ICONS: Record<Plat, string> = { instagram:"📷", tiktok:"🎵", youtube:"▶️" };
const ENGAGEMENT_TYPES: Record<Plat, string[]> = {
  instagram: ["views","likes","saves","shares","reposts","comments"],
  tiktok:    ["views","likes","saves","shares","comments"],
  youtube:   ["views","likes","saves","shares"],
};
const TYPE_ICONS: Record<string, string> = { views:"👁", likes:"👍", saves:"🔖", shares:"📤", reposts:"🔁", comments:"💬" };
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
      <p style={{ fontSize:12, fontWeight:800, color:N.text, margin:"0 0 12px" }}>
        Service IDs <span style={{ color:N.muted, fontWeight:600 }}>(from your panel's Services list)</span>
      </p>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {PLATFORMS.map(p => (
          <button key={p} onClick={() => setOpenPlat(p)}
            style={{
              padding:"7px 14px", borderRadius:10, fontSize:12, fontWeight:700, border:"none", cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", gap:6, textTransform:"capitalize",
              background: N.bg,
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
      <p style={{ fontSize:11, color:N.muted, marginTop:10, fontWeight:600 }}>Find IDs: panel dashboard → Services tab → note the number next to each service</p>
    </div>
  );
}

export default function PanelsPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletMode, setWalletMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [form, setForm] = useState<PanelFormData>(DEFAULT_FORM);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchPanels = async () => {
    const res = await fetch("/api/panels");
    if (res.ok) {
      const d = await res.json();
      setPanels(d.panels ?? []);
      setLoading(false);
      return d.panels ?? [];
    }
    setLoading(false);
    return [];
  };

  const checkHealth = async () => {
    if (panels.length === 0) return;
    setCheckingHealth(true);
    try {
      const res = await fetch("/api/panels/health", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setPanels(prev => prev.map(p => {
          const match = d.panels?.find((r: any) => r.id === p.id);
          if (match) {
            return {
              ...p,
              status: match.status,
              lastResponseMs: match.responseMs,
              balance: match.balance,
              currency: match.currency
            };
          }
          return p;
        }));
      }
    } catch (e) {
      console.error("Health check error:", e);
    }
    setCheckingHealth(false);
  };

  useEffect(() => {
    const checkUserAndStatus = async () => {
      let isSpecial = false;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email?.toLowerCase();
        if (email === "arpitasumanekka@gmail.com" || email === "kg44314@gmail.com") {
          isSpecial = true;
          setIsAdmin(true);
        }
      } catch (e) {
        console.error("User check error:", e);
      }

      try {
        const res = await fetch("/api/billing/status");
        const data = await res.json();
        if (data && data.walletMode && !isSpecial) {
          setWalletMode(true);
          setLoading(false);
        } else {
          const loaded = await fetchPanels();
          if (loaded && loaded.length > 0) {
            setTimeout(checkHealth, 500);
          }
        }
      } catch {
        const loaded = await fetchPanels();
        if (loaded && loaded.length > 0) {
          setTimeout(checkHealth, 500);
        }
      }
    };

    checkUserAndStatus();
  }, []);

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
    setSaving(false); setShowForm(false);
    fetchPanels().then((loaded) => {
      if (loaded.length > 0) checkHealth();
    });
  };

  const deletePanel = async (id: string) => {
    if (!confirm("Remove this panel?")) return;
    await fetch(`/api/panels/${id}`, { method:"DELETE" });
    fetchPanels();
  };

  if (loading) {
    return (
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"60vh" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", border:`3px solid ${N.accent}22`, borderTopColor:N.accent, animation:"spin 1s linear infinite" }} />
      </div>
    );
  }

  if (walletMode && !isAdmin) {
    return (
      <div style={{ maxWidth:860, display:"flex", flexDirection:"column", gap:24 }}>
        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        `}</style>
        {/* Infrastructure Note */}
        <div style={{ borderRadius:24, padding:32, background:N.bg, boxShadow:N.raised, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:12, animation:"fadeUp 0.4s ease-out" }}>
          <span style={{ fontSize:32 }}>🛡️</span>
          <h2 style={{ fontSize:18, fontWeight:900, color:N.text, margin:0, letterSpacing:"-0.5px" }}>Automated Pacing Infrastructure</h2>
          <p style={{ fontSize:13, color:N.muted, fontWeight:600, lineHeight:1.5, margin:0, maxWidth:500 }}>
            All orders are automatically paced through our premium timing network and fail-safe delivery nodes. Your charges are calculated per order and deducted directly from your wallet balance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:860, display:"flex", flexDirection:"column", gap:24 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
        .panel-card:hover{box-shadow:10px 10px 24px #c8d0e7,-5px -5px 14px #ffffff !important}
      `}</style>

      {/* Header section */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:N.text, margin:0, letterSpacing:"-0.5px" }}>SMM Panel Connections</h1>
          <p style={{ fontSize:12, color:N.muted, margin:"4px 0 0", fontWeight:600 }}>Configure your own custom provider key and route orders directly</p>
        </div>
        <button onClick={openAdd} className="neo-btn"
          style={{ padding:"10px 16px", borderRadius:12, background:N.accentBg, color:"#fff", border:"none", fontWeight:800, cursor:"pointer", boxShadow:N.raisedSm, display:"flex", alignItems:"center", gap:6 }}>
          <span>＋ Add Custom Panel</span>
        </button>
      </div>

      {panels.length === 0 ? (
        <div style={{ borderRadius:20, padding:48, background:N.bg, boxShadow:N.raised, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:8, animation:"fadeUp 0.3s ease" }}>
          <span style={{ fontSize:28 }}>🔌</span>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>No custom panels added</h3>
          <p style={{ fontSize:12, color:N.muted, margin:0, fontWeight:600 }}>Add your first SMM API credentials to start routing orders directly to your own account.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))", gap:16, animation:"fadeUp 0.3s ease" }}>
          {panels.map(p => {
            const st = STATUS_STYLES[p.status] ?? STATUS_STYLES.UNKNOWN;
            return (
              <div key={p.id} className="panel-card"
                style={{ borderRadius:20, padding:20, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:14, position:"relative", transition:"box-shadow 0.2s" }}>
                
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>{p.name}</h3>
                    <span style={{ fontSize:10, fontFamily:"monospace", color:N.muted }}>{p.apiUrl}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 8px", borderRadius:8, background:`${st.color}15`, fontSize:11, fontWeight:750, color:st.color }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:st.color, animation: p.status === "ONLINE" ? "pulse 2s infinite" : "none" }} />
                    {st.label}
                  </div>
                </div>

                <div style={{ borderTop:`1px solid ${N.border}`, paddingTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <span style={{ display:"block", fontSize:9, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>Balance</span>
                    <span style={{ fontSize:13, fontWeight:800, color:N.text }}>{p.balance !== undefined ? `$${p.balance.toFixed(2)}` : "—"}</span>
                  </div>
                  <div>
                    <span style={{ display:"block", fontSize:9, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>Speed / Ping</span>
                    <span style={{ fontSize:13, fontWeight:800, color:N.text }}>{p.lastResponseMs ? `${p.lastResponseMs}ms` : "—"}</span>
                  </div>
                </div>

                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button onClick={() => openEdit(p)} className="neo-btn"
                    style={{ flex:1, padding:"8px", borderRadius:10, fontSize:11, fontWeight:800, border:"none", cursor:"pointer", background:N.bg, color:N.text, boxShadow:N.raisedSm }}>
                    ⚙️ Edit
                  </button>
                  <button onClick={() => deletePanel(p.id)} className="neo-btn"
                    style={{ padding:"8px 12px", borderRadius:10, fontSize:11, fontWeight:800, border:"none", cursor:"pointer", background:N.bg, color:"#dc2626", boxShadow:N.raisedSm }}>
                    🗑️ Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connection Modal Overlay */}
      {showForm && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:9999, animation:"fadeUp 0.15s ease-out" }}>
          <div style={{ width:"90%", maxWidth:500, borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:16, maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ fontSize:15, fontWeight:900, color:N.text, margin:0 }}>{editPanel ? "Edit Connection" : "Add Custom SMM API"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", fontSize:20, color:N.muted, cursor:"pointer" }}>×</button>
            </div>

            {error && (
              <div style={{ padding:10, borderRadius:10, background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.2)", fontSize:12, color:"#dc2626", fontWeight:600 }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <NeoInput label="Name / Label" value={form.name} onChange={v => setForm({...form, name:v})} placeholder="e.g. My MoreThanPanel" />
              <NeoInput label="API URL" value={form.apiUrl} onChange={v => setForm({...form, apiUrl:v})} placeholder="https://morethanpanel.com/api/v2" />
              <NeoInput label="API Key / Token" value={form.apiKey} onChange={v => setForm({...form, apiKey:v})} placeholder="Enter SMM panel API key" type="password" />
              
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <NeoInput label="Priority" value={form.priority} onChange={v => setForm({...form, priority:Number(v)})} type="number" />
                <NeoInput label="Load Distribution (%)" value={form.loadPercentage} onChange={v => setForm({...form, loadPercentage:Number(v)})} type="number" />
              </div>

              <ServiceIdConfig svcIds={form.serviceIds} onChange={s => setForm({...form, serviceIds:s})} />
            </div>

            <div style={{ borderTop:`1px solid ${N.border}`, paddingTop:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <button onClick={testConnection} disabled={testing !== null} className="neo-btn"
                style={{ padding:"10px 14px", borderRadius:12, fontSize:12, fontWeight:800, border:"none", cursor:"pointer", background:N.bg, color:N.accent, boxShadow:N.raisedSm, opacity: testing ? 0.6 : 1 }}>
                {testing ? "Connecting..." : "⚡ Test Connection"}
              </button>
              
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setShowForm(false)} className="neo-btn"
                  style={{ padding:"10px 16px", borderRadius:12, fontSize:12, fontWeight:700, border:"none", cursor:"pointer", background:N.bg, color:N.muted, boxShadow:N.raisedSm }}>
                  Cancel
                </button>
                <button onClick={savePanel} disabled={saving} className="neo-btn"
                  style={{ padding:"10px 20px", borderRadius:12, fontSize:12, fontWeight:800, border:"none", cursor:"pointer", background:N.accentBg, color:"#fff", boxShadow:N.raisedSm, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving..." : "Save Connection"}
                </button>
              </div>
            </div>

            {testResult && (
              <div style={{ padding:10, borderRadius:10, background: testResult.ok ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)", border: `1px solid ${testResult.ok ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize:12, color: testResult.ok ? "#16a34a" : "#dc2626", fontWeight:600 }}>
                {testResult.msg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
