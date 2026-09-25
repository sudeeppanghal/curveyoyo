"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { N } from "@/lib/theme";

function NeoInput({ type, placeholder, value, onChange, required, maxLength, style }: { type:string; placeholder:string; value:string; onChange:(v:string)=>void; required?:boolean; maxLength?:number; style?:React.CSSProperties }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e=>onChange(e.target.value)}
      required={required}
      maxLength={maxLength}
      style={{ width:"100%", padding:"13px 16px", borderRadius:12, fontSize:14, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"inherit", transition:"box-shadow 0.2s", ...style }}
      className="neo-input"
    />
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Resend OTP countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP.");
        return;
      }

      setSuccessMsg("🔐 6-digit OTP code sent to your email!");
      setStep(2);
      setCooldown(60);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the 6-digit OTP code sent to your email.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid OTP code.");
        return;
      }

      setResetToken(data.resetToken);
      setSuccessMsg("✅ OTP verified! Enter your new password below.");
      setStep(3);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }

      setSuccessMsg("🎉 Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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

      <div style={{ width:"100%", maxWidth:440 }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link href="/" style={{ textDecoration:"none", display:"inline-flex", alignItems:"center", gap:12, marginBottom:20 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#d97706,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18, color:"#ffffff", boxShadow:N.raised }}>Y</div>
            <span style={{ fontWeight:800, fontSize:20, color:N.text }}>YoyoSMM</span>
          </Link>
          <h1 style={{ fontSize:26, fontWeight:800, color:N.text, margin:"0 0 6px", letterSpacing:"-0.5px" }}>
            {step === 1 ? "Reset Password" : step === 2 ? "Verify Email OTP" : "Set New Password"}
          </h1>
          <p style={{ fontSize:14, color:N.muted, margin:0, fontWeight:500 }}>
            {step === 1 ? "Enter your registered email to receive a 6-digit OTP" : step === 2 ? `OTP sent to ${email}` : "Choose a strong new password"}
          </p>
        </div>

        {/* Step Progress Indicator */}
        <div style={{ display:"flex", gap:8, marginBottom:24, justifyContent:"center" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: i <= step ? "linear-gradient(90deg,#d97706,#ea580c)" : N.inset,
              transition: "all 0.3s ease"
            }} />
          ))}
        </div>

        {/* Card Container */}
        <div style={{ borderRadius:24, padding:"32px 28px", background:N.bg, boxShadow:N.raised }}>
          {error && (
            <div style={{ marginBottom:20, padding:"12px 16px", borderRadius:12, fontSize:13, fontWeight:600, color:"#b91c1c", background:N.bg, boxShadow:"inset 3px 3px 8px rgba(220,38,38,0.2),inset -3px -3px 8px #ffffff" }}>
              ⚠ {error}
            </div>
          )}

          {successMsg && (
            <div style={{ marginBottom:20, padding:"12px 16px", borderRadius:12, fontSize:13, fontWeight:700, color:"#16a34a", background:N.bg, boxShadow:"inset 3px 3px 8px rgba(22,163,74,0.2),inset -3px -3px 8px #ffffff" }}>
              {successMsg}
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Registered Email</label>
                <NeoInput type="email" placeholder="you@example.com" value={email} onChange={setEmail} required />
              </div>

              <button type="submit" disabled={loading} className="neo-btn"
                style={{ width:"100%", padding:"14px", borderRadius:14, fontSize:14, fontWeight:800, cursor:"pointer", border:"none", color:"#ffffff", background:"linear-gradient(135deg,#d97706,#ea580c)", boxShadow:N.raisedSm, marginTop:4, transition:"all 0.2s", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending OTP..." : "Send 6-Digit OTP →"}
              </button>
            </form>
          )}

          {/* STEP 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Enter 6-Digit Code</label>
                <NeoInput
                  type="text"
                  placeholder="e.g. 584920"
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  required
                  style={{ textAlign:"center", fontSize:24, fontWeight:900, letterSpacing:8, color:"#d97706" }}
                />
              </div>

              <button type="submit" disabled={loading} className="neo-btn"
                style={{ width:"100%", padding:"14px", borderRadius:14, fontSize:14, fontWeight:800, cursor:"pointer", border:"none", color:"#ffffff", background:"linear-gradient(135deg,#d97706,#ea580c)", boxShadow:N.raisedSm, marginTop:4, transition:"all 0.2s", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Verifying..." : "Verify OTP Code →"}
              </button>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ border:"none", background:"transparent", fontSize:12, fontWeight:700, color:N.muted, cursor:"pointer" }}
                >
                  ← Change Email
                </button>

                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  style={{ border:"none", background:"transparent", fontSize:12, fontWeight:800, color: cooldown > 0 ? N.muted : N.accent, cursor: cooldown > 0 ? "default" : "pointer" }}
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP Code"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>New Password</label>
                <NeoInput type="password" placeholder="Min 6 characters" value={newPassword} onChange={setNewPassword} required />
              </div>

              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Confirm New Password</label>
                <NeoInput type="password" placeholder="Re-enter password" value={confirmPassword} onChange={setConfirmPassword} required />
              </div>

              <button type="submit" disabled={loading} className="neo-btn"
                style={{ width:"100%", padding:"14px", borderRadius:14, fontSize:14, fontWeight:800, cursor:"pointer", border:"none", color:"#ffffff", background:"linear-gradient(135deg,#16a34a,#059669)", boxShadow:N.raisedSm, marginTop:4, transition:"all 0.2s", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Updating..." : "Reset Password & Login →"}
              </button>
            </form>
          )}

          <p style={{ textAlign:"center", fontSize:13, color:N.muted, marginTop:22, fontWeight:600 }}>
            Remember your password?{" "}
            <Link href="/login" style={{ color:N.accent, textDecoration:"none", fontWeight:800 }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
