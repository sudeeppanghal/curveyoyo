import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organic SMM Delivery — Warmup, Peak & Decay | YoyoSMM",
  description: "Master organic delivery with warmup-peak-decay curves. The logistic S-curve model for high-retention viral pacing.",
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
    <div style={{ background: N.bg, color: N.text, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        .neo-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; items-center; justify-content: center; }
        .neo-btn:hover { transform: translateY(-1px); box-shadow: 10px 10px 20px #c8d0e7, -10px -10px 20px #ffffff !important; }
        .neo-btn:active { transform: translateY(0); box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important; }
        @media (min-width: 768px) {
          .phases-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 24px !important; }
        }
      `}</style>
      
      {/* Navigation */}
      <nav style={{ borderBottom: `1px solid ${N.border}`, background: "rgba(238,242,247,0.95)", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>Y</div>
            <span style={{ fontWeight: 800, fontSize: 20, color: N.text, letterSpacing: "-0.5px" }}>YoyoSMM</span>
          </Link>
          <Link href="/signup" className="neo-btn" style={{ padding: "10px 24px", borderRadius: 999, fontWeight: 800, fontSize: 14, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>
            Get Started →
          </Link>
        </div>
      </nav>

      {/* Main Content Container */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 24px 100px", display: "flex", flexDirection: "column", gap: 48 }}>
        
        {/* Header Section */}
        <div>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: "rgba(217,119,6,0.1)", color: N.accent, border: `1px solid rgba(217,119,6,0.3)`, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            ◆ Core Architecture
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: N.text, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 1.2 }}>
            Organic S-Curve Delivery Engine
          </h1>
          <p style={{ fontSize: 18, fontWeight: 600, color: N.muted, margin: "0 0 24px" }}>
            How warmup-peak-decay curves distribute engagement for maximum algorithmic reach and zero suppression.
          </p>
          <Link href="/signup" className="neo-btn" style={{ padding: "14px 32px", borderRadius: 16, fontWeight: 800, fontSize: 15, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>
            Launch Campaign Pacing →
          </Link>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <section style={{ padding: 36, borderRadius: 28, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>Why Flat Delivery Fails</h2>
            <p style={{ fontSize: 16, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              Standard reseller panels deliver engagement in one flat, artificial burst. When an algorithm detects thousands of views arriving instantly without natural warmup or decay, it classifies the traffic as machine spam and shadowbans the content.
            </p>
            <p style={{ fontSize: 16, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              YoyoSMM uses an independent <strong style={{ color: N.text }}>logistic S-curve engine</strong> — the exact mathematical model that governs real-world viral spreads across TikTok, Instagram, and YouTube.
            </p>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>The Three Phases of Organic Growth</h3>
            <div className="phases-grid" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                ["🌅", "Warmup Phase", "First 2–4 hours: Views start slow (20–30% of total). This gradual start mirrors how natural traffic builds as initial viewers engage."],
                ["⚡", "Peak Viral Phase", "Hours 4–12: The surge (60–80% of total). This occurs during peak traffic windows when audience clustering is highest."],
                ["🌙", "Long-Tail Decay", "Hours 12–72: The natural cooldown (remaining 20%). Views taper smoothly over days, maintaining high account authority."],
              ].map(([icon, title, body]) => (
                <div key={title} style={{ padding: 28, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: N.accent }}>{icon} {title}</div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.6 }}>{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>The Mathematics Behind S-Curve Pacing</h3>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0 }}>
              We compute order dispatch batches using the logistic differential equation:
            </p>
            <div style={{ padding: 20, borderRadius: 16, background: N.bg, boxShadow: N.raisedSm, fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: N.accent, textAlign: "center" }}>
              V(t) = K / (1 + e^(-r(t - t₀)))
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: N.muted, margin: 0, textAlign: "center" }}>
              Where K = Target Engagement Volume, r = Viral Velocity Rate, and t₀ = Peak Dispatch Window.
            </p>
          </section>

          <section style={{ padding: 36, borderRadius: 28, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 20 }}>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>Who Benefits Most?</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["Monetized Creators", "Prioritize steady, high-retention delivery to protect monetization status and algorithmic authority."],
                ["Brands & Agencies", "Deliver consistent, predictable campaign pacing across client portfolios without triggering spam filters."],
                ["High-Volume Operators", "Scale order pacing with automated fail-safe routing that guarantees 99.98% delivery success."],
              ].map(([bold, rest]) => (
                <div key={bold} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15, fontWeight: 500, color: N.muted }}>
                  <span style={{ fontWeight: 900, color: "#16a34a", fontSize: 18, lineHeight: 1 }}>✓</span>
                  <span><strong style={{ color: N.text }}>{bold}:</strong> {rest}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
          <Link href="/" className="neo-btn" style={{ padding: "16px 32px", borderRadius: 16, fontWeight: 700, fontSize: 15, color: N.text, background: N.bg, boxShadow: N.raised }}>
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
