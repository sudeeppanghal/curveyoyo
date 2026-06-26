import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — YoyoSMM",
  description: "Frequently asked questions about YoyoSMM organic delivery engine, pricing, panels, and features.",
};

const FAQ_SECTIONS = [
  {
    title: "Getting Started",
    color: "#F59E0B",
    items: [
      ["How long does it take to set up?", "Less than 5 minutes. Sign up, add your first SMM panel (copy-paste API key), and you're ready to place your first order."],
      ["Do I need existing SMM panels to use YoyoSMM?", "Yes. YoyoSMM is a management layer for your existing panels. You need balance in at least one SMM panel (like SMMKings, Peakerr, or any other). We don't resell views — we manage your panels."],
      ["Is there a free trial?", "Yes — 1-day free trial with full access to all features. No credit card required. After 24 hours, you can get lifetime access for just $20 one-time."],
    ],
  },
  {
    title: "Technical",
    color: "#F59E0B",
    items: [
      ["How many panels can I connect?", "You can connect unlimited SMM panels and add or remove them anytime from Settings."],
      ["Is my API key safe?", "Yes. API keys are AES-256 encrypted at rest, never logged in plain text, and never shared with anyone. You can revoke access anytime."],
      ["Do you support all SMM panels?", "Any panel with a standard REST API works. Popular ones: SMMKings, Peakerr, JustAnotherPanel, SMMHeaven, NicePanel. If your panel isn't listed, email us and we'll add it."],
    ],
  },
  {
    title: "Organic Delivery",
    color: "#F59E0B",
    items: [
      ["Why does organic delivery matter?", "Flat, all-at-once delivery produces an unnatural, machine-flat pattern. Organic curves spread views over 24–48 hours in natural-looking patterns, for steadier, more consistent performance."],
      ["Can I customize delivery timing?", "Yes. Set warmup duration, peak intensity, and decay timing for each order. Save custom curves as templates for reuse."],
      ["How long do orders take to deliver?", "Organic curves: 24–48 hours. Fast curves: 6–12 hours. You choose timing per order."],
    ],
  },
  {
    title: "Failover & Reliability",
    color: "#F59E0B",
    items: [
      ["What happens if my primary panel goes down?", "Orders automatically route to your backup panel. If you have Panel A (primary) and Panel B (backup), orders switch to B in <1 second. Zero customer impact."],
      ["Can I set which panel handles which types of orders?", "Yes. Set priority levels (1, 2, 3...) and load percentages. Panel A handles 70%, Panel B handles 25%, Panel C handles 5%. Adjust anytime."],
      ["What if all my panels are down?", "Orders queue in YoyoSMM and automatically route when a panel comes back online. You get notified, but orders never fail."],
    ],
  },
  {
    title: "Pricing & Billing",
    color: "#F59E0B",
    items: [
      ["Is the $20 really a one-time payment?", "Yes, absolutely. $20 once, use YoyoSMM forever. No monthly fees, no annual renewals, no hidden charges. Future updates included."],
      ["Do you charge a commission on views?", "No. You pay your panel's rate directly. We don't take any cut. If your panel charges $20 per 1k views, you pay $20. No markup."],
      ["What's your refund policy?", "Since there are no monthly fees and we offer a 1-day free trial to test everything before paying, refunds are generally not issued. Contact hello@yoyosmm.online if you have a specific issue."],
    ],
  },
  {
    title: "Account Security",
    color: "#F59E0B",
    items: [
      ["Can I use 2FA?", "Yes. Optional two-factor authentication available. We support TOTP apps (Google Authenticator, Authy) and SMS."],
      ["Is my data encrypted?", "Yes. All data encrypted in transit (HTTPS) and at rest (AES-256). API keys, panel credentials, and order data all encrypted."],
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen text-white" style={{background:"#0B0B0F"}}>
      {/* Nav */}
      <nav className="border-b" style={{background:"rgba(11,11,15,0.95)",borderColor:"rgba(255,255,255,0.06)"}}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{background:"#F59E0B",color:"#0B0B0F"}}>Y</div>
            <span className="font-semibold">YoyoSMM</span>
          </Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-full font-medium text-sm text-[#0B0B0F]" style={{background:"#F59E0B"}}>Get started →</Link>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-xl text-gray-300">Everything you need to know about YoyoSMM.{" "}
          <a href="mailto:hello@yoyosmm.online" className="text-amber-400 hover:underline">hello@yoyosmm.online</a>
        </p>
      </div>

      {/* FAQ sections */}
      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-3xl font-bold mb-8" style={{color:"#F59E0B"}}>{section.title}</h2>
            <div className="space-y-4">
              {section.items.map(([q, a]) => (
                <details key={q} className="rounded-2xl p-6 group" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <summary className="cursor-pointer flex justify-between items-start gap-4 list-none">
                    <h3 className="text-lg font-bold text-white hover:text-amber-400 transition">{q}</h3>
                    <span className="text-amber-400 text-2xl leading-none shrink-0 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-gray-300 mt-4 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div style={{background:"linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))"}}>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-lg mb-8 text-gray-300">Our team responds within 24 hours.</p>
          <Link href="/contact" className="inline-block px-8 py-3 rounded-xl font-bold text-[#0B0B0F] transition-all hover:opacity-90" style={{background:"#F59E0B"}}>Contact Us →</Link>
        </div>
      </div>
    </div>
  );
}
