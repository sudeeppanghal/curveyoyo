import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organic SMM Delivery — Warmup, Peak & Decay | YoyoSMM",
  description: "Master organic delivery with warmup-peak-decay curves. The logistic S-curve model for human-like SMM delivery.",
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

export default function OrganicDeliveryPage() {
  return (
    <div className="min-h-screen text-slate-800" style={{ background: N.bg }}>
      <style>{`
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
      `}</style>

      {/* Nav */}
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
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-black mb-6 leading-tight" style={{ color: N.text, letterSpacing: "-1.5px" }}>Organic Delivery Engine</h1>
        <p className="text-xl font-medium mb-8" style={{ color: N.muted }}>How warmup-peak-decay curves spread SMM delivery for steadier reach.</p>
        <Link href="/signup" className="inline-block px-6 py-3 rounded-xl font-bold text-white no-underline neo-btn mb-16" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Get started →</Link>

        <div className="space-y-12">
          <section>
            <h2 className="text-3xl font-black mb-4" style={{ color: N.text, letterSpacing: "-0.5px" }}>What is Organic Delivery?</h2>
            <p className="text-lg leading-relaxed mb-4 font-medium" style={{ color: N.muted }}>Organic delivery means modeling real audience behavior. When a video gains traction naturally, views don&apos;t arrive in a flat burst — they come in waves. Flat, all-at-once SMM delivery produces an unnatural, machine-flat pattern; gradual waves look closer to natural traffic.</p>
            <p className="text-lg leading-relaxed font-medium" style={{ color: N.muted }}>YoyoSMM uses a <strong>logistic growth curve</strong> (mathematical model used for real-world viral patterns) to deliver views in three phases:</p>
          </section>

          <section>
            <h3 className="text-2xl font-black mb-6" style={{ color: N.text, letterSpacing: "-0.5px" }}>The Three Phases of Organic Growth</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[["🌅","Warmup Phase","First 2–4 hours: Views start slow (20–30% of total). This gradual start mirrors how natural traffic builds. Real viral content rarely explodes instantly."],["⚡","Peak Phase","Hours 4–12: The surge (60–80% of total). This happens during high-traffic windows when real users are most active. Timing matters — we cluster delivery when your audience is online."],["🌙","Natural Decay","Hours 12–24: The slowdown (remaining 20%). Views taper naturally. This is exactly what organic viral patterns look like — explosive peak, natural cooldown."]].map(([icon,title,body])=>(
                <div key={title} className="p-6 rounded-2xl" style={{ background: N.bg, boxShadow: N.raised }}>
                  <h4 className="text-xl font-black mb-3" style={{ color: N.accent }}>{icon} {title}</h4>
                  <p className="leading-relaxed font-medium" style={{ color: N.muted, fontSize: 13, margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="p-8 rounded-2xl" style={{ background: N.bg, boxShadow: N.inset }}>
            <h3 className="text-2xl font-black mb-4" style={{ color: N.text, letterSpacing: "-0.5px" }}>The Math Behind It</h3>
            <p className="mb-4 font-medium" style={{ color: N.muted }}>We use the <strong>logistic growth curve</strong> — the same model that describes viral spread:</p>
            <code className="block p-4 rounded-xl font-mono text-sm mb-4" style={{ background: N.bg, color: N.accent, boxShadow: N.raisedSm }}>V(t) = K / (1 + e^(-r(t-t₀)))</code>
            <p className="text-sm font-bold" style={{ color: N.muted, margin: 0 }}>Where K = peak views, r = growth rate, t = time, t₀ = midpoint. This produces natural S-curve delivery, not flat lines.</p>
          </section>

          <section>
            <h3 className="text-2xl font-black mb-6" style={{ color: N.text, letterSpacing: "-0.5px" }}>Who Benefits Most?</h3>
            <ul className="space-y-3" style={{ paddingLeft: 0, listStyle: "none" }}>
              {[["Monetized accounts","Prioritize steady, predictable delivery. Organic curves help keep performance stable."],["Long-term growth","Compounding engagement beats single spikes. Organic curves build authority over months."],["Brand accounts","Consistent reach matters more than viral moments. Organic curves maintain predictable growth."],["Agencies & resellers","Deliver consistent results across many client accounts with predictable, natural-looking pacing."]].map(([bold,rest])=>(
                <li key={bold} className="flex gap-3 font-medium" style={{ color: N.muted }}>
                  <span className="font-extrabold" style={{ color: N.accent }}>✓</span>
                  <span><strong>{bold}:</strong> {rest}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="p-8 rounded-2xl text-center" style={{ background: N.bg, boxShadow: N.raised }}>
            <h3 className="text-2xl font-black mb-4" style={{ color: N.text }}>Ready to Deliver Organic Growth?</h3>
            <p className="text-lg mb-6 font-medium" style={{ color: N.muted }}>Utilize our premium timing engine to pace your campaigns organically across active traffic windows.</p>
            <Link href="/signup" className="inline-block px-8 py-3 rounded-xl font-bold text-white no-underline neo-btn" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Get started now →</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
