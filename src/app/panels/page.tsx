"use client";
import { useState, useEffect } from "react";

type PanelStatus = "ONLINE" | "OFFLINE" | "SLOW" | "UNKNOWN";

interface ServiceIds {
  instagram?: { views?: string; likes?: string; saves?: string; shares?: string; comments?: string };
  tiktok?: { views?: string; likes?: string; saves?: string; shares?: string; comments?: string };
  youtube?: { views?: string; likes?: string; saves?: string; shares?: string };
}

interface Panel {
  id: string; name: string; apiUrl: string; priority: number;
  loadPercentage: number; isActive: boolean; status: PanelStatus;
  lastCheckedAt: string | null; lastResponseMs: number | null; successRate: number;
  serviceIds: ServiceIds | null;
}

const STATUS_STYLES: Record<PanelStatus, { color: string; bg: string; label: string }> = {
  ONLINE:  { color: "#34d399", bg: "rgba(52,211,153,0.1)",  label: "Online" },
  OFFLINE: { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "Offline" },
  SLOW:    { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  label: "Slow" },
  UNKNOWN: { color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: "Unknown" },
};

const PLATFORMS = ["instagram", "tiktok", "youtube"] as const;
type Plat = typeof PLATFORMS[number];
const PLAT_ICONS: Record<Plat, string> = { instagram: "📷", tiktok: "🎵", youtube: "▶️" };
const ENGAGEMENT_TYPES: Record<Plat, string[]> = {
  instagram: ["views", "likes", "saves", "shares", "comments"],
  tiktok:    ["views", "likes", "saves", "shares", "comments"],
  youtube:   ["views", "likes", "saves", "shares"],
};
const TYPE_ICONS: Record<string, string> = {
  views: "👁", likes: "👍", saves: "🔖", shares: "📤", comments: "💬",
};

function ServiceIdConfig({
  svcIds, onChange,
}: { svcIds: ServiceIds; onChange: (s: ServiceIds) => void }) {
  const [openPlat, setOpenPlat] = useState<Plat>("instagram");
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-300">Service IDs <span className="text-gray-600 font-normal">(from your panel's Services list)</span></p>
      <div className="flex gap-2">
        {PLATFORMS.map((p) => (
          <button key={p} onClick={() => setOpenPlat(p)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 capitalize transition-all"
            style={openPlat === p ? { background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.35)" } : { background: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.06)" }}>
            {PLAT_ICONS[p]} {p}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {ENGAGEMENT_TYPES[openPlat].map((type) => (
          <div key={type}>
            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <span>{TYPE_ICONS[type]}</span>
              <span className="capitalize">{type} Service ID</span>
            </label>
            <input
              placeholder={`e.g. 1234`}
              value={(svcIds[openPlat] as Record<string, string> | undefined)?.[type] ?? ""}
              onChange={(e) => {
                const updated: ServiceIds = { ...svcIds, [openPlat]: { ...(svcIds[openPlat] ?? {}), [type]: e.target.value } };
                onChange(updated);
              }}
              className="w-full px-3 py-2 rounded-lg text-sm text-white font-mono outline-none focus:ring-1 focus:ring-amber-500/40"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-1">Find service IDs: your panel dashboard → Services tab → note the ID next to each service name</p>
    </div>
  );
}

interface PanelFormData {
  name: string; apiUrl: string; apiKey: string;
  priority: number; loadPercentage: number;
  serviceIds: ServiceIds;
}

const DEFAULT_FORM: PanelFormData = {
  name: "", apiUrl: "", apiKey: "", priority: 1, loadPercentage: 100,
  serviceIds: { instagram: {}, tiktok: {}, youtube: {} },
};

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

  const openAdd = () => {
    setEditPanel(null);
    setForm(DEFAULT_FORM);
    setTestResult(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (p: Panel) => {
    setEditPanel(p);
    setForm({ name: p.name, apiUrl: p.apiUrl, apiKey: "", priority: p.priority, loadPercentage: p.loadPercentage, serviceIds: p.serviceIds ?? { instagram: {}, tiktok: {}, youtube: {} } });
    setTestResult(null);
    setError("");
    setShowForm(true);
  };

  const testConnection = async () => {
    if (!form.apiUrl || !form.apiKey) return;
    setTesting("testing");
    const res = await fetch("/api/panels/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiUrl: form.apiUrl, apiKey: form.apiKey }),
    });
    const d = await res.json();
    setTesting(null);
    setTestResult({ ok: res.ok && d.ok, msg: d.balance !== undefined ? `✓ Connected — Balance: $${d.balance}` : d.error ?? "Connection failed" });
  };

  const savePanel = async () => {
    setSaving(true); setError("");
    const res = await fetch(editPanel ? `/api/panels/${editPanel.id}` : "/api/panels", {
      method: editPanel ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Save failed"); setSaving(false); return; }
    setSaving(false); setShowForm(false); fetchPanels();
  };

  const deletePanel = async (id: string) => {
    if (!confirm("Remove this panel?")) return;
    await fetch(`/api/panels/${id}`, { method: "DELETE" });
    fetchPanels();
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">SMM Panels</h1>
          <p className="text-gray-400 text-sm mt-1">Connect your panels — we handle routing, failover & engagement</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F] hover:opacity-90 transition" style={{ background: "#F59E0B" }}>
          + Add Panel
        </button>
      </div>

      {/* Panel list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        </div>
      ) : panels.length === 0 ? (
        <div className="rounded-2xl border py-16 text-center" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-4xl mb-3">🔌</p>
          <p className="font-semibold text-white mb-1">No panels connected</p>
          <p className="text-gray-500 text-sm mb-5">Connect your first SMM panel to start delivering views + engagement</p>
          <button onClick={openAdd} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F]" style={{ background: "#F59E0B" }}>Add First Panel →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {panels.map((p, idx) => {
            const st = STATUS_STYLES[p.status];
            const hasServiceIds = p.serviceIds && Object.values(p.serviceIds).some((plat) => Object.values(plat ?? {}).some(Boolean));
            return (
              <div key={p.id} className="rounded-2xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="flex items-start gap-4">
                  {/* Priority badge */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#0B0B0F] shrink-0" style={{ background: idx === 0 ? "#F59E0B" : "rgba(255,255,255,0.12)", color: idx === 0 ? "#0B0B0F" : "#9ca3af" }}>
                    {p.priority}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white">{p.name}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      {!p.isActive && <span className="px-2 py-0.5 rounded-full text-xs text-gray-500 border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>Paused</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{p.apiUrl}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span>Priority: <span className="text-white font-medium">{p.priority}</span></span>
                      <span>Load: <span className="text-white font-medium">{p.loadPercentage}%</span></span>
                      {p.lastResponseMs && <span>Response: <span className={p.lastResponseMs > 5000 ? "text-amber-400" : "text-emerald-400"}>{p.lastResponseMs}ms</span></span>}
                      <span>{hasServiceIds ? <span className="text-emerald-400">✓ Service IDs set</span> : <span className="text-amber-400">⚠ No service IDs</span>}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/5 transition border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>Edit</button>
                    <button onClick={() => deletePanel(p.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-400/10 transition border" style={{ borderColor: "rgba(248,113,113,0.25)" }}>Remove</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How-to tip */}
      <div className="rounded-xl border p-4 text-xs text-gray-500 space-y-1" style={{ background: "rgba(255,255,255,0.01)", borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="font-semibold text-gray-400 mb-1">💡 How to find Service IDs</p>
        <p>1. Log into your SMM panel (e.g. SMMKings, Peakerr, JustAnotherPanel)</p>
        <p>2. Go to <strong>Services</strong> tab → search "Instagram Reels Views" → note the ID (e.g. "1234")</p>
        <p>3. Do the same for Likes, Saves, Shares, Comments — enter each in the service ID fields above</p>
        <p>4. Panel priority 1 = primary, 2 = first failover, 3 = second failover (failover is automatic, sub-1s)</p>
      </div>

      {/* Add/Edit Form Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-2xl rounded-2xl border overflow-hidden max-h-[90vh] flex flex-col" style={{ background: "#0d0d12", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h2 className="font-bold text-white">{editPanel ? "Edit Panel" : "Add Panel"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Basic info */}
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "name", label: "Panel Name", placeholder: "e.g. SMMKings Primary" },
                  { key: "apiUrl", label: "API URL", placeholder: "https://your-panel.com/api/v2" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
                    <input value={(form as unknown as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                ))}
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key {editPanel && <span className="text-gray-600">(leave blank to keep current)</span>}</label>
                <div className="flex gap-2">
                  <input type="password" value={form.apiKey} onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder={editPanel ? "••••••••" : "Paste your API key"}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  <button onClick={testConnection} disabled={!form.apiUrl || (!form.apiKey && !editPanel) || testing === "testing"}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition"
                    style={{ background: "rgba(99,102,241,0.85)" }}>
                    {testing === "testing" ? "Testing…" : "Test"}
                  </button>
                </div>
                {testResult && (
                  <p className="mt-1.5 text-xs" style={{ color: testResult.ok ? "#34d399" : "#f87171" }}>{testResult.msg}</p>
                )}
              </div>

              {/* Priority + Load */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Priority (1 = primary)</label>
                  <input type="number" min={1} max={10} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Load % (100 = all traffic)</label>
                  <input type="number" min={1} max={100} value={form.loadPercentage} onChange={(e) => setForm((f) => ({ ...f, loadPercentage: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
              </div>

              {/* Service IDs */}
              <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <ServiceIdConfig svcIds={form.serviceIds} onChange={(s) => setForm((f) => ({ ...f, serviceIds: s }))} />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border hover:bg-white/5 transition" style={{ borderColor: "rgba(255,255,255,0.08)" }}>Cancel</button>
              <button onClick={savePanel} disabled={saving || !form.name || !form.apiUrl}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0B0B0F] disabled:opacity-40 transition" style={{ background: "#F59E0B" }}>
                {saving ? "Saving…" : editPanel ? "Save Changes" : "Add Panel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
