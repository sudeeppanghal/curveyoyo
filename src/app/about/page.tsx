import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — YoyoSMM",
  description: "The story behind YoyoSMM — the organic delivery engine for SMM operators.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen text-white" style={{background:"#0B0B0F"}}>
      <nav className="border-b" style={{background:"rgba(11,11,15,0.95)",borderColor:"rgba(255,255,255,0.06)"}}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{background:"#F59E0B",color:"#0B0B0F"}}>Y</div>
            <span className="font-semibold">YoyoSMM</span>
          </Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-full font-medium text-sm text-[#0B0B0F]" style={{background:"#F59E0B"}}>Get started →</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20 space-y-12">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6" style={{background:"rgba(245,158,11,0.12)",color:"#F59E0B",border:"1px solid rgba(245,158,11,0.25)"}}>◆ Our Story</div>
          <h1 className="text-5xl font-bold mb-6">Built by operators, for operators</h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            YoyoSMM was born out of frustration — juggling three SMM panel tabs, watching orders fail during panel downtime, and delivering flat, unnatural view patterns that hurt long-term performance.
          </p>
        </div>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p>We built YoyoSMM as the layer that sits on top of your existing SMM panels. You keep your balance, your relationships with your panels, and your freedom to switch anytime. We handle the routing, the failover, and the organic delivery curves.</p>
          <p>The organic S-curve delivery engine is based on the same logistic growth model that describes how real viral content spreads. When a video genuinely goes viral, views don't arrive in a flat burst — they build, peak, and naturally decay. We replicate that pattern for every campaign.</p>
          <p>Multi-panel priority failover means you never lose an order to panel downtime again. Set Panel 1 as primary, Panel 2 as backup — if Panel 1 goes down, Panel 2 takes over in under a second. Zero lost orders. Your clients never notice.</p>
        </div>

        <div className="rounded-2xl border p-8" style={{background:"rgba(245,158,11,0.05)",borderColor:"rgba(245,158,11,0.2)"}}>
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-gray-300 leading-relaxed">To give every SMM operator — from solo resellers to agencies running hundreds of clients — the same delivery intelligence that only enterprise-level tools had access to. At a price that makes sense: $20, once, forever.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {[["120+","Compatible panel APIs"],["50k+","MAU capacity"],["Sub-1s","Panel failover speed"]].map(([val,label])=>(
            <div key={label} className="text-center p-6 rounded-2xl border" style={{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.06)"}}>
              <p className="text-3xl font-bold text-white">{val}</p>
              <p className="text-sm text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Contact</h2>
          <p className="text-gray-400 mb-2">General: <a href="mailto:hello@yoyosmm.online" className="text-amber-400 hover:underline">hello@yoyosmm.online</a></p>
          <p className="text-gray-400 mb-2">Support: <a href="mailto:support@yoyosmm.online" className="text-amber-400 hover:underline">support@yoyosmm.online</a></p>
          <p className="text-gray-400">Bugs: <a href="mailto:bugs@yoyosmm.online" className="text-amber-400 hover:underline">bugs@yoyosmm.online</a></p>
        </div>

        <div className="flex gap-4">
          <Link href="/signup" className="px-6 py-3 rounded-xl font-semibold text-[#0B0B0F] hover:opacity-90 transition" style={{background:"#F59E0B"}}>Start Free Trial →</Link>
          <Link href="/" className="px-6 py-3 rounded-xl font-medium text-gray-300 hover:bg-white/5 transition border" style={{borderColor:"rgba(255,255,255,0.08)"}}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
