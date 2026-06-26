"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"profile"|"security"|"notifications"|"templates">("profile");
  const [profileForm, setProfileForm] = useState({ name:"", email:"" });
  const [passwordForm, setPasswordForm] = useState({ current:"", newPass:"", confirm:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{type:"ok"|"err";text:string}|null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data.templates) setTemplates(data.templates);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setMsg({ type: "ok", text: "Template deleted!" });
      } else {
        setMsg({ type: "err", text: "Delete failed" });
      }
    } catch (e) {
      setMsg({ type: "err", text: String(e) });
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { name: profileForm.name } });
      if (error) { setMsg({type:"err",text:error.message}); return; }
      setMsg({type:"ok",text:"Profile updated!"});
      router.refresh();
    } finally { setSaving(false); }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    if (passwordForm.newPass !== passwordForm.confirm) {
      setMsg({type:"err",text:"Passwords don't match"}); setSaving(false); return;
    }
    if (passwordForm.newPass.length < 8) {
      setMsg({type:"err",text:"New password must be 8+ characters"}); setSaving(false); return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
      if (error) { setMsg({type:"err",text:error.message}); return; }
      setMsg({type:"ok",text:"Password updated!"}); setPasswordForm({current:"",newPass:"",confirm:""});
    } finally { setSaving(false); }
  };

  const TABS = [
    ["profile","👤","Profile"],
    ["security","🔒","Security"],
    ["notifications","🔔","Notifications"],
    ["templates","📈","Curve Templates"]
  ] as const;

  const handleTabClick = (t: "profile"|"security"|"notifications"|"templates") => {
    setTab(t);
    setMsg(null);
    if (t === "templates") {
      loadTemplates();
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account, security, and preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{background:"rgba(255,255,255,0.04)"}}>
        {TABS.map(([id,icon,label]) => (
          <button key={id} onClick={()=>handleTabClick(id)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab===id?"text-white":"text-gray-400 hover:text-white"}`} style={tab===id ? {background:"rgba(245,158,11,0.15)",color:"#F59E0B"} : {}}>
            <span>{icon}</span><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Alert */}
      {msg && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{background: msg.type==="ok" ? "rgba(52,211,153,0.12)" : "rgba(220,38,38,0.12)", color: msg.type==="ok" ? "#34d399" : "#f87171", border:`1px solid ${msg.type==="ok" ? "rgba(52,211,153,0.25)" : "rgba(220,38,38,0.25)"}`}}>
          {msg.type==="ok" ? "✓" : "✗"} {msg.text}
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="rounded-2xl border p-6" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
          <h3 className="font-semibold text-white mb-5">Profile Information</h3>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Display Name</label>
              <input type="text" value={profileForm.name} onChange={e=>setProfileForm({...profileForm,name:e.target.value})} placeholder="Your name" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email <span className="text-xs text-gray-500">(cannot change)</span></label>
              <input type="email" disabled value={profileForm.email} placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl text-sm text-gray-500 outline-none cursor-not-allowed" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)"}} />
            </div>
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F] hover:opacity-90 disabled:opacity-60 transition" style={{background:"#F59E0B"}}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </form>
        </div>
      )}

      {/* Security tab */}
      {tab === "security" && (
        <div className="space-y-5">
          <div className="rounded-2xl border p-6" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
            <h3 className="font-semibold text-white mb-5">Change Password</h3>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
                <input type="password" required minLength={8} value={passwordForm.newPass} onChange={e=>setPasswordForm({...passwordForm,newPass:e.target.value})} placeholder="Min. 8 characters" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New Password</label>
                <input type="password" required value={passwordForm.confirm} onChange={e=>setPasswordForm({...passwordForm,confirm:e.target.value})} placeholder="Repeat new password" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}} />
              </div>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition" style={{background:"rgba(99,102,241,0.9)"}}>
                {saving ? "Updating…" : "Update Password"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border p-6" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-400 mt-1">Add an extra layer of security with TOTP (Google Authenticator, Authy).</p>
              </div>
              <button className="px-4 py-2 rounded-lg text-sm font-medium text-white border hover:bg-white/5 transition" style={{borderColor:"rgba(255,255,255,0.1)"}}>Enable 2FA</button>
            </div>
          </div>

          <div className="rounded-2xl border p-6" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
            <h3 className="font-semibold text-white mb-4">Active Sessions</h3>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:"rgba(52,211,153,0.12)"}}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              </div>
              <div>
                <p className="text-white font-medium">Current session</p>
                <p className="text-gray-500 text-xs">This device · Active now</p>
              </div>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium" style={{background:"rgba(52,211,153,0.12)",color:"#34d399"}}>Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Templates tab */}
      {tab === "templates" && (
        <div className="space-y-5">
          <div className="rounded-2xl border p-6" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
            <h3 className="font-semibold text-white mb-1">Your Curve Templates</h3>
            <p className="text-gray-400 text-sm mb-6">Presets for views scheduling and engagement rates that can be loaded instantly during campaign creation.</p>
            
            {loadingTemplates ? (
              <p className="text-gray-500 text-sm">Loading templates…</p>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-xl" style={{borderColor:"rgba(255,255,255,0.08)"}}>
                No templates saved yet. Create a campaign and check "Save as template" to add one.
              </div>
            ) : (
              <div className="grid gap-4">
                {templates.map((t) => (
                  <div key={t.id} className="rounded-xl border p-4 flex items-center justify-between transition-all hover:bg-white/[0.01]" style={{background:"rgba(255,255,255,0.01)",borderColor:"rgba(255,255,255,0.06)"}}>
                    <div>
                      <p className="font-medium text-white">{t.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
                        <span>Style: <strong className="text-amber-400">{t.style}</strong></span>
                        <span>Duration: <strong>{t.durationHours}h</strong></span>
                        <span>Warmup: <strong>{t.warmupHours}h</strong></span>
                        <span>Peak: <strong>{t.peakHours}h</strong></span>
                        <span>Likes: <strong>{t.likesRatioPct}%</strong></span>
                        <span>Saves: <strong>{t.savesRatioPct}%</strong></span>
                      </div>
                    </div>
                    <button onClick={() => deleteTemplate(t.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-400/20 hover:bg-red-400/10 transition">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
