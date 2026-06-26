import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organic SMM Delivery — Warmup, Peak & Decay | YoyoSMM",
  description: "Master organic delivery with warmup-peak-decay curves. The logistic S-curve model for human-like SMM delivery.",
};

export default function OrganicDeliveryPage() {
  return (
    <div className="min-h-screen text-white" style={{background:"linear-gradient(135deg, #0f172a, #1e293b, #0f172a)"}}>
      <nav className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{background:"#F59E0B",color:"#0B0B0F"}}>Y</div>
            <span className="font-semibold">YoyoSMM</span>
          </Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-lg font-medium text-sm text-[#0B0B0F]" style={{background:"#F59E0B"}}>Get started →</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-6">Organic Delivery Engine</h1>
        <p className="text-xl text-gray-300 mb-4">How warmup-peak-decay curves spread delivery for steadier reach.</p>
        <Link href="/signup" className="inline-block px-6 py-3 rounded-lg font-semibold text-[#0B0B0F] hover:opacity-90 transition mb-16" style={{background:"#F59E0B"}}>Get started →</Link>

        <div className="space-y-12">
          <section>
            <h2 className="text-3xl font-bold mb-4">What is Organic Delivery?</h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-4">Organic delivery means modeling real audience behavior. When a video gains traction naturally, views don&apos;t arrive in a flat burst — they come in waves. Flat, all-at-once delivery produces an unnatural, machine-flat pattern; gradual waves look closer to natural traffic.</p>
            <p className="text-gray-300 text-lg leading-relaxed">YoyoSMM uses a <strong>logistic growth curve</strong> (mathematical model used for real-world viral patterns) to deliver views in three phases:</p>
          </section>

          <section>
            <h3 className="text-2xl font-bold mb-6">The Three Phases of Organic Growth</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[["🌅","Warmup Phase","First 2–4 hours: Views start slow (20–30% of total). This gradual start mirrors how natural traffic builds. Real viral content rarely explodes instantly."],["⚡","Peak Phase","Hours 4–12: The surge (60–80% of total). This happens during high-traffic windows when real users are most active. Timing matters — we cluster delivery when your audience is online."],["🌙","Natural Decay","Hours 12–24: The slowdown (remaining 20%). Views taper naturally. This is exactly what organic viral patterns look like — explosive peak, natural cooldown."]].map(([icon,title,body])=>(
                <div key={title} className="p-6 rounded-xl" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(245,158,11,0.3)"}}>
                  <h4 className="text-xl font-bold mb-3" style={{color:"#F59E0B"}}>{icon} {title}</h4>
                  <p className="text-gray-300 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="p-8 rounded-xl" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)"}}>
            <h3 className="text-2xl font-bold mb-4">The Math Behind It</h3>
            <p className="text-gray-300 mb-4">We use the <strong>logistic growth curve</strong> — the same model that describes viral spread:</p>
            <code className="block p-4 rounded-lg font-mono text-sm mb-4" style={{background:"#0B0B0F",color:"#F59E0B"}}>V(t) = K / (1 + e^(-r(t-t₀)))</code>
            <p className="text-gray-300 text-sm">Where K = peak views, r = growth rate, t = time, t₀ = midpoint. This produces natural S-curve delivery, not flat lines.</p>
          </section>

          <section>
            <h3 className="text-2xl font-bold mb-6">Who Benefits Most?</h3>
            <ul className="space-y-3 text-gray-300">
              {[["Monetized accounts","Prioritize steady, predictable delivery. Organic curves help keep performance stable."],["Long-term growth","Compounding engagement beats single spikes. Organic curves build authority over months."],["Brand accounts","Consistent reach matters more than viral moments. Organic curves maintain predictable growth."],["Agencies & resellers","Deliver consistent results across many client accounts with predictable, natural-looking pacing."]].map(([bold,rest])=>(
                <li key={bold} className="flex gap-3">
                  <span className="font-bold" style={{color:"#F59E0B"}}>✓</span>
                  <span><strong>{bold}:</strong> {rest}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="p-8 rounded-xl text-center" style={{background:"linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.2))"}}>
            <h3 className="text-2xl font-bold mb-4">Ready to Deliver Organic Growth?</h3>
            <p className="text-lg mb-6 text-amber-50">Connect your SMM panel and let organic curves spread delivery across natural traffic windows.</p>
            <Link href="/signup" className="inline-block px-8 py-3 rounded-xl font-bold text-[#0B0B0F] hover:opacity-90 transition" style={{background:"#F59E0B"}}>Get started — $20 lifetime →</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
