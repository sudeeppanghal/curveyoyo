"use client";
import { useState, useEffect } from "react";
import { N } from "@/lib/theme";



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
    fetch("/api/billing/status")
      .then(res => res.json())
      .then(data => {
        if (data && data.walletMode) {
          setWalletMode(true);
          setLoading(false);
        } else {
          fetchPanels().then((loaded) => {
            if (loaded && loaded.length > 0) {
              setTimeout(checkHealth, 500);
            }
          });
        }
      })
      .catch(() => {
        fetchPanels().then((loaded) => {
          if (loaded && loaded.length > 0) {
            setTimeout(checkHealth, 500);
          }
        });
      });
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
