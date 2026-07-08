"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { N } from "@/lib/theme";



function NeoInput({ type, placeholder, value, onChange, required }: { type:string; placeholder:string; value:string; onChange:(v:string)=>void; required?:boolean; }) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} required={required}
      style={{ width:"100%", padding:"13px 16px", borderRadius:12, fontSize:14, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"inherit", transition:"box-shadow 0.2s" }}
      className="neo-input"
    />
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name:"", email:"", phone:"", password:"" });
  const [loading, setLoading] = useState(false);
  // Check for oauth error redirects
  const [error, setError] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("error") 
        ? "Google signup failed. Please try registering by typing your Name, Email, and Password below."
        : "";
    }
    return "";
  });
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const refCode = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("ref") || localStorage.getItem("yoyo_ref")) : undefined;
      const res = await fetch("/api/auth/signup", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ ...form, referredBy: refCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed. Please try again."); return; }
      setSuccess(true);
      // Auto-confirm is ON — redirect to login after 2 seconds
      setTimeout(() => { router.push("/login?registered=1"); }, 2000);
    } catch { setError("Network error. Please check your connection and try again."); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard` },
    });
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyItems:"center", justifyContent:"center", padding:"24px 16px", background:N.bg, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.3) !important;outline:none}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:10px 10px 20px #c8d0e7,-10px -10px 20px #ffffff !important}
        .neo-btn:active{transform:translateY(0);box-shadow:inset 4px 4px 8px #c8d0e7,inset -4px -4px 8px #ffffff !important}
        .neo-ghost:hover{box-shadow:8px 8px 16px #c8d0e7,-8px -8px 16px #ffffff !important}
      `}</style>

      <div style={{ width:"100%", maxWidth:420 }}>

        {success ? (
          <div style={{ borderRadius:24, padding:"40px 28px", background:N.bg, boxShadow:N.raised, textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:20, background:"rgba(22,163,74,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 20px", boxShadow:N.raised }}>✅</div>
            <h2 style={{ fontSize:22, fontWeight:800, color:N.text, margin:"0 0 10px" }}>Account Created!</h2>
            <p style={{ fontSize:14, color:N.muted, margin:"0 0 24px", fontWeight:500 }}>Welcome to YoyoSMM! Your account for <strong style={{ color:N.text }}>{form.email}</strong> is ready. Redirecting you to sign in…</p>
            <Link href="/login" style={{ display:"inline-block", padding:"12px 28px", borderRadius:12, fontSize:14, fontWeight:800, textDecoration:"none", color:"#ffffff", background:"linear-gradient(135deg,#d97706,#ea580c)", boxShadow:N.raisedSm }} className="neo-btn">
              Sign In Now →
            </Link>
          </div>
        ) : (
          <>
            {/* Logo */}
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <Link href="/" style={{ textDecoration:"none", display:"inline-flex", alignItems:"center", gap:12, marginBottom:24 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#d97706,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18, color:"#ffffff", boxShadow:N.raised }}>Y</div>
                <span style={{ fontWeight:800, fontSize:20, color:N.text }}>YoyoSMM</span>
              </Link>
              <h1 style={{ fontSize:26, fontWeight:800, color:N.text, margin:"0 0 6px", letterSpacing:"-0.5px" }}>Create Free Account</h1>
              <p style={{ fontSize:14, color:N.muted, margin:0, fontWeight:500 }}>Instant setup · Pay as you go with wallet balance</p>
            </div>

            {/* Card */}
            <div style={{ borderRadius:24, padding:"32px 28px", background:N.bg, boxShadow:N.raised }}>

              {/* Features */}
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:24, padding:"16px", borderRadius:14, boxShadow:N.inset }}>
                {["✅ S-curve organic pacing delivery", "✅ Pay per order from wallet", "✅ Automated engagement schedules"].map(f => (
                  <p key={f} style={{ fontSize:12, color:N.text, margin:0, fontWeight:700 }}>{f}</p>
                ))}
              </div>

              {error && (
                <div style={{ marginBottom:20, padding:"12px 16px", borderRadius:12, fontSize:13, fontWeight:600, color:"#b91c1c", background:N.bg, boxShadow:"inset 3px 3px 8px rgba(220,38,38,0.2),inset -3px -3px 8px #ffffff" }}>⚠ {error}</div>
              )}

              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Full Name</label>
                  <NeoInput type="text" placeholder="Your name" value={form.name} onChange={v=>setForm({...form,name:v})} required />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Email</label>
                  <NeoInput type="email" placeholder="you@example.com" value={form.email} onChange={v=>setForm({...form,email:v})} required />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Phone Number</label>
                  <NeoInput type="tel" placeholder="Your phone number" value={form.phone} onChange={v=>setForm({...form,phone:v})} required />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Password</label>
                  <NeoInput type="password" placeholder="Min 8 characters" value={form.password} onChange={v=>setForm({...form,password:v})} required />
                </div>
                <button type="submit" disabled={loading} className="neo-btn"
                  style={{ width:"100%", padding:"14px", borderRadius:14, fontSize:14, fontWeight:800, cursor:"pointer", border:"none", color:"#ffffff", background:"linear-gradient(135deg,#d97706,#ea580c)", boxShadow:N.raisedSm, marginTop:4, transition:"all 0.2s", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Creating account…" : "Create Free Account →"}
                </button>
              </form>

              <div style={{ position:"relative", margin:"22px 0", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1, height:1, background:N.border }} />
                <span style={{ fontSize:12, color:N.muted, fontWeight:700 }}>or</span>
                <div style={{ flex:1, height:1, background:N.border }} />
              </div>

              <button onClick={handleGoogle} className="neo-ghost"
                style={{ width:"100%", padding:"13px", borderRadius:14, fontSize:14, fontWeight:700, cursor:"pointer", border:"none", color:N.text, background:N.bg, boxShadow:N.raisedSm, display:"flex", alignItems:"center", justifyContent:"center", gap:10, transition:"all 0.2s" }}>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18Z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17Z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07Z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31Z"/>
                </svg>
                Continue with Google
              </button>

              <p style={{ textAlign:"center", fontSize:13, color:N.muted, marginTop:22, fontWeight:600 }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color:N.accent, textDecoration:"none", fontWeight:800 }}>Sign in →</Link>
              </p>
            </div>

            <div style={{ textAlign:"center", marginTop:20 }}>
              <Link href="/" style={{ fontSize:12, color:N.muted, textDecoration:"none", fontWeight:600 }}>← Back to home</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
