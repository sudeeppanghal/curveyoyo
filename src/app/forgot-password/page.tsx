"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  text:     "#2d3748",
  muted:    "#718096",
  border:   "rgba(200, 208, 231, 0.4)",
};

function NeoInput({ type, placeholder, value, onChange, required }: { type:string; placeholder:string; value:string; onChange:(v:string)=>void; required?:boolean; }) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} required={required}
      style={{ width:"100%", padding:"13px 16px", borderRadius:12, fontSize:14, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"inherit", transition:"box-shadow 0.2s" }}
      className="neo-input"
    />
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { error: authError } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
      });
      if (authError) { setError(authError.message); return; }
      setSuccess(true);
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyItems:"center", justifyContent:"center", padding:"24px 16px", background:N.bg, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.3) !important;outline:none}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:10px 10px 20px #c8d0e7,-10px -10px 20px #ffffff !important}
        .neo-btn:active{transform:translateY(0);box-shadow:inset 4px 4px 8px #c8d0e7,inset -4px -4px 8px #ffffff !important}
      `}</style>

      <div style={{ width:"100%", maxWidth:420 }}>
        {success ? (
          <div style={{ borderRadius:24, padding:"40px 28px", background:N.bg, boxShadow:N.raised, textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:20, background:"rgba(22,163,74,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 20px", boxShadow:N.raised }}>✅</div>
            <h2 style={{ fontSize:22, fontWeight:800, color:N.text, margin:"0 0 10px" }}>Check your inbox</h2>
            <p style={{ fontSize:14, color:N.muted, margin:"0 0 24px", fontWeight:500 }}>We sent a password reset link to <strong style={{ color:N.text }}>{email}</strong>.</p>
            <Link href="/login" style={{ display:"inline-block", padding:"12px 28px", borderRadius:12, fontSize:14, fontWeight:800, textDecoration:"none", color:"#ffffff", background:"linear-gradient(135deg,#d97706,#ea580c)", boxShadow:N.raisedSm }} className="neo-btn">
              Return to login →
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <Link href="/" style={{ textDecoration:"none", display:"inline-flex", alignItems:"center", gap:12, marginBottom:24 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#d97706,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18, color:"#ffffff", boxShadow:N.raised }}>Y</div>
                <span style={{ fontWeight:800, fontSize:20, color:N.text }}>YoyoSMM</span>
              </Link>
              <h1 style={{ fontSize:26, fontWeight:800, color:N.text, margin:"0 0 6px", letterSpacing:"-0.5px" }}>Reset Password</h1>
              <p style={{ fontSize:14, color:N.muted, margin:0, fontWeight:500 }}>Enter your email to receive a reset link</p>
            </div>

            <div style={{ borderRadius:24, padding:"32px 28px", background:N.bg, boxShadow:N.raised }}>
              {error && (
                <div style={{ marginBottom:20, padding:"12px 16px", borderRadius:12, fontSize:13, fontWeight:600, color:"#b91c1c", background:N.bg, boxShadow:"inset 3px 3px 8px rgba(220,38,38,0.2),inset -3px -3px 8px #ffffff" }}>⚠ {error}</div>
              )}

              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Email</label>
                  <NeoInput type="email" placeholder="you@example.com" value={email} onChange={setEmail} required />
                </div>
                <button type="submit" disabled={loading} className="neo-btn"
                  style={{ width:"100%", padding:"14px", borderRadius:14, fontSize:14, fontWeight:800, cursor:"pointer", border:"none", color:"#ffffff", background:"linear-gradient(135deg,#d97706,#ea580c)", boxShadow:N.raisedSm, marginTop:4, transition:"all 0.2s", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Sending..." : "Send Reset Link →"}
                </button>
              </form>

              <p style={{ textAlign:"center", fontSize:13, color:N.muted, marginTop:22, fontWeight:600 }}>
                Remember your password?{" "}
                <Link href="/login" style={{ color:N.accent, textDecoration:"none", fontWeight:800 }}>Sign in →</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
