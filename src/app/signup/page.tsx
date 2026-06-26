"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); return; }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:"#0B0B0F",backgroundImage:"radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245,158,11,0.10), transparent)"}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{background:"#F59E0B",color:"#0B0B0F"}}>Y</div>
            <span className="font-semibold text-xl text-white">YoyoSMM</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400 mt-2 text-sm">1-day free trial · No credit card required</p>
        </div>

        <div className="rounded-2xl border p-8" style={{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.08)"}}>
          {success ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl" style={{background:"rgba(52,211,153,0.15)"}}>✓</div>
              <h3 className="text-white font-semibold text-lg mb-2">Account created!</h3>
              <p className="text-gray-400 text-sm">Check your email to confirm, then you&apos;ll be redirected to your dashboard.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-300" style={{background:"rgba(220,38,38,0.12)",border:"1px solid rgba(220,38,38,0.25)"}}>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input type="text" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:ring-2 focus:ring-amber-500/40" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:ring-2 focus:ring-amber-500/40" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                <input type="password" required minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min. 8 characters" className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:ring-2 focus:ring-amber-500/40" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}} />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-semibold text-[#0B0B0F] transition-all hover:opacity-90 hover:scale-[1.01] disabled:opacity-60" style={{background:"#F59E0B"}}>
                {loading ? "Creating account…" : "Start 1-Day Free Trial →"}
              </button>
            </form>
          )}

          {!success && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{borderColor:"rgba(255,255,255,0.07)"}} /></div>
                <div className="relative flex justify-center text-xs text-gray-500"><span className="px-3" style={{background:"rgba(15,15,20,0.7)"}}>or</span></div>
              </div>
              <button onClick={handleGoogle} className="w-full py-3 rounded-xl border text-sm font-medium text-gray-300 transition-all hover:bg-white/5 flex items-center justify-center gap-2" style={{borderColor:"rgba(255,255,255,0.1)"}}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18Z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17Z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07Z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31Z"/></svg>
                Continue with Google
              </button>
              <p className="text-center text-sm text-gray-500 mt-5">
                Already have an account?{" "}<Link href="/login" className="text-amber-400 hover:underline font-medium">Sign in</Link>
              </p>
            </>
          )}
        </div>

        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-gray-600">🔒 AES-256 encrypted · HTTPS · No spam</p>
          <p className="text-xs text-gray-600">After 1-day trial: Lifetime access for <strong className="text-amber-400">$20</strong> one-time</p>
        </div>
        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
