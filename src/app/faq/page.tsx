import Link from "next/link";
import type { Metadata } from "next";
import { PublicNav, PublicFooter } from "../PublicHeaderFooter";

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
    title: "Platform Features & Coverage",
    items: [
      ["Which platforms are supported?", "We currently support high-retention views and organic engagement (likes, saves, comments, shares, followers, subscribers, members, retweets, and reactions) across Instagram, TikTok, YouTube, Telegram, Facebook, and Twitter."],
      ["Are my campaign links secure?", "Yes. All campaign targets, video links, and transaction logs are fully private and encrypted. We never share your order details."],
      ["How is the pacing system different from normal panels?", "Normal SMM panels deliver engagement in one flat spike, which looks artificial. Our timing layer distributes delivery over your chosen duration, mimicking organic viral spread."],
    ],
  },
  {
    title: "Organic Pacing & Curves",
    items: [
      ["Why does organic pacing matter?", "Sudden spikes in views produce flat artificial trends that trigger algorithmic suppression. Pacing curves spread views over 24–72 hours in natural bell curves or s-curves, giving the algorithm the signals it needs to push your content organically."],
      ["Can I customize the pacing speed?", "Yes. You can choose between presets (Organic, Fast, Aggressive, Waves, and more) or draw your own custom pacing delivery curve directly on our canvas."],
      ["How long do campaigns run?", "You have full control. You can set the campaign duration anywhere from 6 hours to 72 hours per post."],
    ],
  },
  {
    title: "Fail-Safe Infrastructure & Billing",
    items: [
      ["What is your zero-drop routing guarantee?", "Our engine utilizes multiple redundant delivery nodes. If any route experiences network latency, our system redirects the batch instantly to an active backup path — guaranteeing 99.98% uptime with zero lost orders."],
      ["How does billing work?", "You add funds to your wallet balance. Each time you place an order, your charges are calculated per order on-demand, according to our transparent direct pricing. No hidden fees."],
      ["Can I integrate via API?", "Yes. Our platform provides a standard compatible API that allows agencies and high-volume operators to automate order submission and track pacing diagnostics in real time."],
    ],
  },
];

export default function FAQPage() {
  return (
    <div style={{ background: N.bg, color: N.text, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        .neo-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; items-center; justify-content: center; }
        .neo-btn:hover { transform: translateY(-1px); box-shadow: 10px 10px 20px #c8d0e7, -10px -10px 20px #ffffff !important; }
        .neo-btn:active { transform: translateY(0); box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important; }
        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
        details[open] summary span { transform: rotate(45deg); }
      `}</style>
      
      <PublicNav />

      {/* Main Content Container */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 24px 40px", display: "flex", flexDirection: "column", gap: 48 }}>
        
        {/* Header Section */}
        <div>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: "rgba(217,119,6,0.1)", color: N.accent, border: `1px solid rgba(217,119,6,0.3)`, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            ◆ Knowledge Base
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: N.text, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 1.2 }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: 16, fontWeight: 600, color: N.muted, margin: 0 }}>
            Everything you need to know about YoyoSMM&apos;s independent organic pacing engine.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {FAQ_SECTIONS.map((section) => (
            <section key={section.title} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: N.accent, margin: 0, letterSpacing: "-0.5px" }}>{section.title}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {section.items.map(([q, a]) => (
                  <details key={q} style={{ padding: 24, borderRadius: 20, background: N.bg, boxShadow: N.raised, cursor: "pointer", transition: "all 0.2s" }}>
                    <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, outline: "none", fontWeight: 800, fontSize: 17, color: N.text }}>
                      <span>{q}</span>
                      <span style={{ fontSize: 24, fontWeight: 400, color: N.accent, transition: "transform 0.2s" }}>+</span>
                    </summary>
                    <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: "16px 0 0", lineHeight: 1.7, cursor: "text" }}>{a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA Card */}
        <div style={{ padding: 40, borderRadius: 28, background: N.bg, boxShadow: N.inset, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: N.text, margin: 0 }}>Still Have Questions?</h2>
          <p style={{ fontSize: 16, fontWeight: 500, color: N.muted, margin: 0 }}>Our global engineering support team responds in under 2 hours.</p>
          <a href="mailto:hello@yoyosmm.online" className="neo-btn" style={{ padding: "16px 36px", borderRadius: 16, fontWeight: 800, fontSize: 15, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm, textDecoration: "none", marginTop: 8 }}>
            Contact Support →
          </a>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link href="/" className="neo-btn" style={{ padding: "16px 32px", borderRadius: 16, fontWeight: 700, fontSize: 15, color: N.text, background: N.bg, boxShadow: N.raised }}>
            ← Back to Home
          </Link>
        </div>

      </div>
      <PublicFooter />
    </div>
  );
}
