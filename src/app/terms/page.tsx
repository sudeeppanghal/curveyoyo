import Link from "next/link";
import type { Metadata } from "next";
import { PublicNav, PublicFooter } from "../PublicHeaderFooter";
import { N } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Terms of Service — YoyoSMM",
  description: "Terms and conditions for using the YoyoSMM organic delivery platform.",
};



export default function TermsPage() {
  return (
    <div style={{ background: N.bg, color: N.text, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        .neo-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; items-center; justify-content: center; }
        .neo-btn:hover { transform: translateY(-1px); box-shadow: 10px 10px 20px #c8d0e7, -10px -10px 20px #ffffff !important; }
        .neo-btn:active { transform: translateY(0); box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important; }
      `}</style>
      
      <PublicNav />

      {/* Main Content Container */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 24px 40px", display: "flex", flexDirection: "column", gap: 36 }}>
        
        {/* Header Section */}
        <div>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: "rgba(217,119,6,0.1)", color: N.accent, border: `1px solid rgba(217,119,6,0.3)`, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            ◆ Legal & Compliance
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: N.text, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 1.2 }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: 16, fontWeight: 600, color: N.muted, margin: 0 }}>
            Last updated: July 2026
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0 }}>1. Agreement to Terms</h2>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              By accessing and using YoyoSMM, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our proprietary organic delivery platform.
            </p>
          </section>

          <section style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0 }}>2. Wallet & Billing System</h2>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              YoyoSMM operates on an independent wholesale, pre-funded wallet balance model. You must deposit funds into your account (minimum ₹500 via UPI) to launch organic delivery pacing campaigns. Your charges are calculated per order on-demand.
            </p>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              <strong style={{ color: N.text }}>Refund Policy:</strong> All deposits made to your wallet balance are final. We do not support refunds once a balance is successfully credited or partially used for active campaigns.
            </p>
          </section>

          <section style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0 }}>3. Service Pacing & Completion</h2>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              Our proprietary pacing engine dispatches views, likes, saves, comments, and shares according to your chosen logistic S-curve style across Instagram, TikTok, and Facebook. Pacing schedules are approximations and can be impacted by social platform traffic fluctuations.
            </p>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              Engagement batches trigger automatically according to our high-retention schedule. Any remaining engagement is always flushed to completion during the final campaign hour with fail-safe routing protection.
            </p>
          </section>

          <section style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0 }}>4. Account Security & Independence</h2>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              You are responsible for keeping your login credentials confidential and securing your account. YoyoSMM operates as an independent wholesale pacing layer and is not liable for unauthorized access or third-party misuse of your wallet balance.
            </p>
          </section>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 16 }}>
          <Link href="/privacy" className="neo-btn" style={{ padding: "16px 32px", borderRadius: 16, fontWeight: 800, fontSize: 15, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>
            Privacy Policy →
          </Link>
          <Link href="/" className="neo-btn" style={{ padding: "16px 32px", borderRadius: 16, fontWeight: 700, fontSize: 15, color: N.text, background: N.bg, boxShadow: N.raised }}>
            ← Back to Home
          </Link>
        </div>

      </div>
      <PublicFooter />
    </div>
  );
}
