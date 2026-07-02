import Link from "next/link";
import type { Metadata } from "next";
import { PublicNav, PublicFooter } from "../PublicHeaderFooter";

export const metadata: Metadata = {
  title: "About — YoyoSMM",
  description: "The story behind YoyoSMM — the world's #1 organic pacing SMM panel.",
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
    <div style={{ background: N.bg, color: N.text, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        .neo-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; items-center; justify-content: center; }
        .neo-btn:hover { transform: translateY(-1px); box-shadow: 10px 10px 20px #c8d0e7, -10px -10px 20px #ffffff !important; }
        .neo-btn:active { transform: translateY(0); box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important; }
      `}</style>
      
      <PublicNav />

      {/* Main Content Container */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 24px 40px", display: "flex", flexDirection: "column", gap: 40 }}>
        
        {/* Header Section */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: "rgba(217,119,6,0.1)", color: N.accent, border: `1px solid rgba(217,119,6,0.3)`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ◆ Our Story
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: N.text, letterSpacing: "-1.5px", margin: 0, lineHeight: 1.2 }}>
            Built by operators, for independent creators
          </h1>
          <p style={{ fontSize: 18, fontWeight: 600, color: N.muted, maxWidth: 680, margin: 0, lineHeight: 1.6 }}>
            YoyoSMM was born to solve standard SMM delivery limitations. Traditional panels deliver engagement in flat, artificial bursts that harm algorithmic performance. We set out to build the world&apos;s most organic pacing platform.
          </p>
        </div>

        {/* Story Card */}
        <div style={{ padding: 40, borderRadius: 28, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 20, fontSize: 16, fontWeight: 500, color: N.muted, lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>
            We built YoyoSMM as an <strong style={{ color: N.text }}>independent, premium SMM panel</strong> with built-in organic timing layers. We provide high-retention views and engagement (likes, saves, shares, comments, followers, subscribers, members, retweets, and reactions) that match your selected pacing schedules perfectly.
          </p>
          <p style={{ margin: 0 }}>
            Our S-curve pacing engine is modeled after the natural logistic growth of real viral content across Instagram, TikTok, YouTube, Telegram, Facebook, and Twitter. When a post goes viral, engagement builds slowly, reaches a peak, and then decays naturally. We replicate this exact flow.
          </p>
          <p style={{ margin: 0 }}>
            Our fail-safe routing infrastructure guarantees zero drops. If any delivery path experiences network latency, our system automatically redirects the batch instantly — guaranteeing 99.98% uptime with zero lost orders.
          </p>
        </div>

        {/* 3 Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            ["100%", "Automated Pacing"],
            ["10k+", "Active Campaigns"],
            ["Sub-1s", "Routing Latency"],
          ].map(([val, label]) => (
            <div key={label} style={{ padding: 28, borderRadius: 24, background: N.bg, boxShadow: N.raised, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: N.accent, marginBottom: 6, letterSpacing: "-1px" }}>{val}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: N.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Mission Card */}
        <div style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>Our Mission</h2>
          <p style={{ fontSize: 15, fontWeight: 600, color: N.muted, margin: 0, lineHeight: 1.7 }}>
            To give creators, agencies, and brands access to a premium, timed delivery layer that matches real viral pacing. Our easy wallet-based pricing means you only pay for what you order on-demand, with no monthly subscriptions or hidden markups.
          </p>
        </div>

        {/* Contact Info Card */}
        <div style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>Get In Touch</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, fontWeight: 600, color: N.muted }}>
            <div>General Inquiries: <a href="mailto:hello@yoyosmm.online" style={{ color: N.accent, fontWeight: 700, textDecoration: "none" }}>hello@yoyosmm.online</a></div>
            <div>Technical Support: <a href="mailto:support@yoyosmm.online" style={{ color: N.accent, fontWeight: 700, textDecoration: "none" }}>support@yoyosmm.online</a></div>
            <div>Security & Bug Reports: <a href="mailto:bugs@yoyosmm.online" style={{ color: N.accent, fontWeight: 700, textDecoration: "none" }}>bugs@yoyosmm.online</a></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
          <Link href="/signup" className="neo-btn" style={{ padding: "16px 36px", borderRadius: 16, fontWeight: 800, fontSize: 16, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>
            Launch Your First Campaign →
          </Link>
          <Link href="/" className="neo-btn" style={{ padding: "16px 32px", borderRadius: 16, fontWeight: 700, fontSize: 16, color: N.text, background: N.bg, boxShadow: N.raised }}>
            ← Back to Home
          </Link>
        </div>

      </div>
      <PublicFooter />
    </div>
  );
}
