import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — YoyoSMM",
  description: "The story behind YoyoSMM — the organic delivery engine for SMM operators.",
};

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  accentBg: "linear-gradient(135deg, #d97706, #ea580c)",
  text:     "#2d3748",
  muted:    "#718096",
  border:   "rgba(200, 208, 231, 0.4)",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen text-slate-800" style={{ background: N.bg }}>
      <style>{`
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
      `}</style>
      
      {/* Navigation */}
      <nav className="border-b" style={{ background: "rgba(238,242,247,0.95)", borderColor: N.border }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Y</div>
            <span className="font-extrabold text-slate-800">YoyoSMM</span>
          </Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-full font-bold text-sm text-white no-underline neo-btn" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Get started →</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-20 space-y-12">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6" style={{ background: "rgba(217,119,6,0.1)", color: N.accent, border: `1px solid ${N.accent}40` }}>◆ Our Story</div>
          <h1 className="text-5xl font-black mb-6 leading-tight" style={{ color: N.text, letterSpacing: "-1.5px" }}>Built by operators, for operators</h1>
          <p className="text-xl leading-relaxed font-medium" style={{ color: N.muted }}>
            YoyoSMM was born out of frustration — juggling three SMM panel tabs, watching orders fail during panel downtime, and delivering flat, unnatural view patterns that hurt long-term performance.
          </p>
        </div>

        <div className="space-y-6 leading-relaxed font-medium" style={{ color: N.muted }}>
          <p>We built YoyoSMM as the layer that sits on top of your existing SMM panels. You keep your balance, your relationships with your panels, and your freedom to switch anytime. We handle the routing, the failover, and the organic delivery curves.</p>
          <p>The organic S-curve delivery engine is based on the same logistic growth model that describes how real viral content spreads. When a video genuinely goes viral, views don't arrive in a flat burst — they build, peak, and naturally decay. We replicate that pattern for every campaign.</p>
          <p>Multi-panel priority failover means you never lose an order to panel downtime again. Set Panel 1 as primary, Panel 2 as backup — if Panel 1 goes down, Panel 2 takes over in under a second. Zero lost orders. Your clients never notice.</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: N.bg, boxShadow: N.inset }}>
          <h2 className="text-2xl font-black mb-4" style={{ color: N.text, letterSpacing: "-0.5px" }}>Our Mission</h2>
          <p className="leading-relaxed font-medium" style={{ color: N.muted }}>To give every SMM operator — from solo resellers to agencies running hundreds of clients — the same delivery intelligence that only enterprise-level tools had access to. At a price that makes sense: $20, once, forever.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {[["120+","Compatible panel APIs"],["50k+","MAU capacity"],["Sub-1s","Panel failover speed"]].map(([val, label]) => (
            <div key={label} className="text-center p-6 rounded-2xl" style={{ background: N.bg, boxShadow: N.raised }}>
              <p className="text-3xl font-black mb-1" style={{ color: N.accent }}>{val}</p>
              <p className="text-xs font-bold uppercase tracking-wide mt-1" style={{ color: N.muted, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-2xl font-black mb-4" style={{ color: N.text, letterSpacing: "-0.5px" }}>Contact</h2>
          <p className="mb-2 font-medium" style={{ color: N.muted }}>General: <a href="mailto:hello@yoyosmm.online" className="hover:underline font-bold" style={{ color: N.accent }}>hello@yoyosmm.online</a></p>
          <p className="mb-2 font-medium" style={{ color: N.muted }}>Support: <a href="mailto:support@yoyosmm.online" className="hover:underline font-bold" style={{ color: N.accent }}>support@yoyosmm.online</a></p>
          <p className="font-medium" style={{ color: N.muted }}>Bugs: <a href="mailto:bugs@yoyosmm.online" className="hover:underline font-bold" style={{ color: N.accent }}>bugs@yoyosmm.online</a></p>
        </div>

        <div className="flex gap-4">
          <Link href="/signup" className="px-6 py-3 rounded-xl font-bold text-white no-underline neo-btn" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Start Free Trial →</Link>
          <Link href="/" className="px-6 py-3 rounded-xl font-bold no-underline neo-btn" style={{ background: N.bg, color: N.muted, boxShadow: N.raisedSm }}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
