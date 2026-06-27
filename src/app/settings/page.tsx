"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const N = {
  bg:       "#111118",
  raised:   "8px 8px 20px rgba(0,0,0,0.65), -4px -4px 12px rgba(255,255,255,0.05)",
  raisedSm: "4px 4px 12px rgba(0,0,0,0.6), -2px -2px 8px rgba(255,255,255,0.04)",
  inset:    "inset 4px 4px 10px rgba(0,0,0,0.6), inset -2px -2px 6px rgba(255,255,255,0.04)",
  accent:   "#F59E0B",
  text:     "#e2e8f0",
  muted:    "#4a5568",
};

function NeoInput({ label, type="text", value, onChange, placeholder, disabled }: { label:string; type?:string; value:string; onChange?:(v:string)=>void; placeholder?:string; disabled?:boolean }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ width:"100%", padding:"12px 16px", borderRadius:12, fontSize:13, background:N.bg, border:"none", color: disabled ? N.muted : N.text, outline:"none", boxShadow: disabled ? N.inset : N.inset, fontFamily:"inherit", transition:"box-shadow 0.2s", cursor: disabled ? "not-allowed" : "text", opacity: disabled ? 0.6 : 1 }}
        className="neo-input"
      />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"profile"|"security"|"notifications"|"templates">("profile");
  const [profileForm, setProfileForm] = useState({ name:"", email:"" });
  const [passwordForm, setPasswordForm] = useState({ current:"", newPass:"", confirm:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{type:"ok"|"err";text:string}|null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data.templates) setTemplates(data.templates);
    } catch(e) { console.error(e); }
    finally { setLoadingTemplates(false); }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method:"DELETE" });
      if (res.ok) { setTemplates(prev => prev.filter(t => t.id !== id)); setMsg({ type:"ok", text:"Template deleted!" }); }
      else setMsg({ type:"err", text:"Delete failed" });
    } catch(e) { setMsg({ type:"err", text:String(e) }); }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const { error } = await createClient().auth.updateUser({ data: { name: profileForm.name } });
      if (error) { setMsg({type:"err",text:error.message}); return; }
      setMsg({type:"ok",text:"Profile updated!"}); router.refresh();
    } finally { setSaving(false); }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    if (passwordForm.newPass !== passwordForm.confirm) { setMsg({type:"err",text:"Passwords don't match"}); setSaving(false); return; }
    if (passwordForm.newPass.length < 8) { setMsg({type:"err",text:"New password must be 8+ characters"}); setSaving(false); return; }
    try {
      const { error } = await createClient().auth.updateUser({ password: passwordForm.newPass });
      if (error) { setMsg({type:"err",text:error.message}); return; }
      setMsg({type:"ok",text:"Password updated!"}); setPasswordForm({current:"",newPass:"",confirm:""});
    } finally { setSaving(false); }
  };

  const TABS = [
    ["profile","👤","Profile"],
    ["security","🔒","Security"],
    ["notifications","🔔","Notifications"],
    ["templates","📈","Curve Templates"],
  ] as const;

  const handleTabClick = (t: "profile"|"security"|"notifications"|"templates") => {
    setTab(t); setMsg(null);
    if (t === "templates") loadTemplates();
  };

  return (
    <div style={{ maxWidth:720, display:"flex", flexDirection:"column", gap:24 }}>
      <style>{`
        .neo-input:focus{box-shadow:inset 5px 5px 14px rgba(0,0,0,0.7),inset -3px -3px 8px rgba(255,255,255,0.05),0 0 0 2px rgba(245,158,11,0.25) !important}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px rgba(0,0,0,0.7),-4px -4px 12px rgba(255,255,255,0.07) !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px rgba(0,0,0,0.6),inset -1px -1px 4px rgba(255,255,255,0.04) !important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div>
        <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-0.5px" }}>Settings</h1>
        <p style={{ fontSize:13, color:N.muted, margin:0 }}>Manage your account, security, and preferences</p>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:8, padding:8, borderRadius:18, background:N.bg, boxShadow:N.inset }}>
        {TABS.map(([id,icon,label]) => (
          <button key={id} onClick={() => handleTabClick(id)}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px 8px", borderRadius:12, fontSize:12, fontWeight:700, border:"none", cursor:"pointer", transition:"all 0.2s", fontFamily:"inherit",
              background: tab === id ? N.bg : "transparent",
              color: tab === id ? N.accent : N.muted,
              boxShadow: tab === id ? N.raisedSm : "none",
            }}>
            <span>{icon}</span><span style={{ display:"none" }} className="sm-show">{label}</span>
            <span style={{ display:"inline" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Alert */}
      {msg && (
        <div style={{ padding:"12px 16px", borderRadius:12, fontSize:13, fontWeight:600, background:N.bg, boxShadow: msg.type === "ok" ? "inset 3px 3px 8px rgba(52,211,153,0.3),inset -2px -2px 5px rgba(0,0,0,0.4)" : "inset 3px 3px 8px rgba(220,38,38,0.3),inset -2px -2px 5px rgba(0,0,0,0.4)", color: msg.type === "ok" ? "#34d399" : "#f87171" }}>
          {msg.type === "ok" ? "✓" : "✗"} {msg.text}
        </div>
      )}

      {/* Profile Tab */}
      {tab === "profile" && (
        <div style={{ borderRadius:20, padding:28, background:N.bg, boxShadow:N.raised, animation:"fadeUp 0.3s ease" }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 22px" }}>Profile Information</h3>
          <form onSubmit={handleProfileSave} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <NeoInput label="Display Name" value={profileForm.name} onChange={v=>setProfileForm({...profileForm,name:v})} placeholder="Your name"/>
            <NeoInput label={`Email (cannot change)`} type="email" value={profileForm.email} placeholder="your@email.com" disabled />
            <div>
              <button type="submit" disabled={saving} className="neo-btn"
                style={{ padding:"11px 24px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", cursor:"pointer", color:"#08080c", background:"linear-gradient(135deg,#F59E0B,#F97316)", boxShadow:"6px 6px 16px rgba(0,0,0,0.6),-3px -3px 10px rgba(255,255,255,0.07)", transition:"all 0.2s", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {tab === "security" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeUp 0.3s ease" }}>
          {/* Change Password */}
          <div style={{ borderRadius:20, padding:28, background:N.bg, boxShadow:N.raised }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 22px" }}>Change Password</h3>
            <form onSubmit={handlePasswordSave} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <NeoInput label="New Password" type="password" value={passwordForm.newPass} onChange={v=>setPasswordForm({...passwordForm,newPass:v})} placeholder="Min. 8 characters"/>
              <NeoInput label="Confirm New Password" type="password" value={passwordForm.confirm} onChange={v=>setPasswordForm({...passwordForm,confirm:v})} placeholder="Repeat new password"/>
              <div>
                <button type="submit" disabled={saving} className="neo-btn"
                  style={{ padding:"11px 24px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", cursor:"pointer", color:N.text, background:N.bg, boxShadow:"6px 6px 16px rgba(0,0,0,0.6),-3px -3px 10px rgba(255,255,255,0.07)", transition:"all 0.2s", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          </div>

          {/* 2FA */}
          <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 4px" }}>Two-Factor Authentication</h3>
              <p style={{ fontSize:12, color:N.muted, margin:0 }}>Add extra security with TOTP (Google Authenticator, Authy)</p>
            </div>
            <button style={{ padding:"9px 18px", borderRadius:11, fontSize:12, fontWeight:700, border:"none", cursor:"pointer", color:N.text, background:N.bg, boxShadow:N.raisedSm }}>
              Enable 2FA
            </button>
          </div>

          {/* Sessions */}
          <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 16px" }}>Active Sessions</h3>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:38, height:38, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", background:N.bg, boxShadow:N.inset }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:"#34d399", display:"inline-block", boxShadow:"0 0 8px #34d399" }}/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700, color:N.text, margin:"0 0 2px" }}>Current session</p>
                <p style={{ fontSize:11, color:N.muted, margin:0 }}>This device · Active now</p>
              </div>
              <span style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, color:"#34d399", background:N.bg, boxShadow:N.inset }}>Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === "notifications" && (
        <div style={{ borderRadius:20, padding:28, background:N.bg, boxShadow:N.raised, animation:"fadeUp 0.3s ease" }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 22px" }}>Notification Preferences</h3>
          {[
            { label:"Order completed", desc:"When a delivery campaign finishes", on:true },
            { label:"Panel offline", desc:"When a panel goes offline", on:true },
            { label:"Refill triggered", desc:"When a panel top-up refill fires", on:false },
          ].map(pref => (
            <div key={pref.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:N.text, margin:"0 0 3px" }}>{pref.label}</p>
                <p style={{ fontSize:12, color:N.muted, margin:0 }}>{pref.desc}</p>
              </div>
              <div style={{ width:44, height:24, borderRadius:12, cursor:"pointer", background:N.bg, boxShadow: pref.on ? "inset 3px 3px 8px rgba(0,0,0,0.6),inset -2px -2px 5px rgba(245,158,11,0.3)" : N.inset, position:"relative", transition:"all 0.2s", flexShrink:0 }}>
                <div style={{ position:"absolute", top:4, left: pref.on ? 22 : 4, width:16, height:16, borderRadius:"50%", background: pref.on ? N.accent : N.muted, boxShadow:N.raisedSm, transition:"all 0.2s" }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Tab */}
      {tab === "templates" && (
        <div style={{ borderRadius:20, padding:28, background:N.bg, boxShadow:N.raised, animation:"fadeUp 0.3s ease" }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 6px" }}>Curve Templates</h3>
          <p style={{ fontSize:12, color:N.muted, margin:"0 0 22px" }}>Presets for views scheduling and engagement rates — load instantly during campaign creation.</p>
          {loadingTemplates ? (
            <p style={{ fontSize:13, color:N.muted }}>Loading templates…</p>
          ) : templates.length === 0 ? (
            <div style={{ padding:"40px 24px", textAlign:"center", borderRadius:14, background:N.bg, boxShadow:N.inset }}>
              <p style={{ fontSize:13, color:N.muted }}>No templates saved yet. Create a campaign and check &quot;Save as template&quot; to add one.</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {templates.map(t => (
                <div key={t.id} style={{ borderRadius:14, padding:"16px 18px", background:N.bg, boxShadow:N.raised, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:N.text, margin:"0 0 6px" }}>{t.name}</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:10, fontSize:11, color:N.muted }}>
                      <span>Style: <strong style={{ color:N.accent }}>{t.style}</strong></span>
                      <span>Duration: <strong style={{ color:N.text }}>{t.durationHours}h</strong></span>
                      <span>Likes: <strong style={{ color:N.text }}>{t.likesRatioPct}%</strong></span>
                      <span>Saves: <strong style={{ color:N.text }}>{t.savesRatioPct}%</strong></span>
                    </div>
                  </div>
                  <button onClick={() => deleteTemplate(t.id)} style={{ padding:"7px 14px", borderRadius:10, fontSize:12, fontWeight:700, border:"none", cursor:"pointer", color:"#f87171", background:N.bg, boxShadow:N.raisedSm }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
