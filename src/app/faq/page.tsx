import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — YoyoSMM",
  description: "Frequently asked questions about YoyoSMM organic delivery engine, pricing, panels, and features.",
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

const FAQ_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      ["How long does it take to set up?", "Less than 2 minutes. Sign up, deposit funds into your wallet using UPI, and you're ready to launch your first pacing campaign."],
      ["Do I need to connect any external panels?", "No. YoyoSMM operates as an independent, fully-featured pacing SMM panel. We manage the timing and delivery layer internally — you only need to add funds to your wallet to start."],
      ["Is there a minimum deposit?", "Yes. The minimum deposit is ₹500, which can be deposited instantly using UPI. There are no monthly fees or subscriptions."],
    ],
  },
  {
    title: "Platform Features",
    items: [
      ["Which platforms are supported?", "We currently support high-retention views and organic engagement (likes, saves, comments, and shares) for Instagram, TikTok, and YouTube."],
      ["Are my campaign links secure?", "Yes. All campaign targets, video links, and transaction logs are fully private and encrypted. We never share your order details."],
      ["How is the pacing system different from normal panels?", "Normal SMM panels deliver engagement in one flat spike, which looks artificial. Our timing layer distributes delivery over your chosen duration, mimicking viral spread."],
    ],
  },
  {
    title: "Organic Pacing",
    items: [
      ["Why does organic pacing matter?", "Sudden spikes in views produce flat artificial trends. Pacing curves spread views over 24–48 hours in natural bell curves or s-curves, giving the algorithm the signals it needs to push your content organically."],
      ["Can I customize the pacing speed?", "Yes. You can choose between presets (Organic, Fast, Aggressive, Waves, and more) or draw your own custom pacing delivery curve directly on our canvas."],
      ["How long do campaigns run?", "You have full control. You can set the campaign duration anywhere from 6 hours to 72 hours per post."],
    ],
  },
  {
    title: "Reliability & Speed",
    items: [
      ["What happens if a SMM delivery node is delayed?", "Our system utilizes automated failover routing. If a delivery path is congested, the system automatically redirects the batch to an active backup path in under a second — guaranteeing zero drops."],
      ["Can I schedule multiple posts at once?", "Yes. You can configure and run unlimited simultaneous campaigns, and monitor their status in real-time from the dashboard."],
    ],
  },
  {
    title: "Pricing & Wallet",
    items: [
      ["How are campaign costs calculated?", "Costs are calculated based on the custom rates of the service and quantity you choose. You will see the exact cost before launching any campaign, and it will be deducted from your wallet balance."],
      ["What is your refund policy?", "Deposits are manually verified and processed into your wallet. If you have any issues or need support, contact our team at support@yoyosmm.online."],
    ],
  },
];

export default function FAQPage() {
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

      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-black mb-4 leading-tight" style={{ color: N.text, letterSpacing: "-1.5px" }}>Frequently Asked Questions</h1>
        <p className="text-xl font-medium" style={{ color: N.muted }}>
          Everything you need to know about YoyoSMM. Contact at{" "}
          <a href="mailto:hello@yoyosmm.online" className="font-bold hover:underline" style={{ color: N.accent }}>hello@yoyosmm.online</a>
        </p>
      </div>

      {/* FAQ sections */}
      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-3xl font-black mb-8" style={{ color: N.accent, letterSpacing: "-0.5px" }}>{section.title}</h2>
            <div className="space-y-6">
              {section.items.map(([q, a]) => (
                <details key={q} className="rounded-2xl p-6 group transition-all" style={{ background: N.bg, boxShadow: N.raised }}>
                  <summary className="cursor-pointer flex justify-between items-start gap-4 list-none outline-none">
                    <h3 className="text-lg font-black transition-colors" style={{ color: N.text, margin: 0, letterSpacing: "-0.2px" }}>{q}</h3>
                    <span className="text-2xl leading-none shrink-0 group-open:rotate-45 transition-transform" style={{ color: N.accent }}>+</span>
                  </summary>
                  <p className="mt-4 leading-relaxed font-medium" style={{ color: N.muted, margin: "16px 0 0" }}>{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div style={{ background: N.bg, boxShadow: N.inset, borderTop: `1px solid ${N.border}` }}>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-black mb-4" style={{ color: N.text }}>Still Have Questions?</h2>
          <p className="text-lg mb-8 font-medium" style={{ color: N.muted }}>Our team responds within 24 hours.</p>
          <a href="mailto:hello@yoyosmm.online" className="inline-block px-8 py-3 rounded-xl font-bold text-white no-underline neo-btn" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Contact Us →</a>
        </div>
      </div>
    </div>
  );
}
