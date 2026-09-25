import Link from "next/link";
import type { Metadata } from "next";
import { PublicNav, PublicFooter } from "../PublicHeaderFooter";
import { N } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Privacy Policy — YoyoSMM",
  description: "Privacy policy and data protection guidelines for YoyoSMM users.",
};



export default function PrivacyPage() {
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
            ◆ Privacy & Security
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: N.text, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 1.2 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 16, fontWeight: 600, color: N.muted, margin: 0 }}>
            Last updated: July 2026
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0 }}>1. Information We Collect</h2>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              We collect only the essential details needed to operate your pacing campaigns and secure your wallet account:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, fontWeight: 500, color: N.muted }}>
              <div><strong style={{ color: N.text }}>• Account Data:</strong> Email, username, and password hashes for authentication.</div>
              <div><strong style={{ color: N.text }}>• Campaign Inputs:</strong> Social media links (Instagram, TikTok, Facebook) provided to track campaign delivery.</div>
              <div><strong style={{ color: N.text }}>• Billing Logs:</strong> UPI deposit reference numbers and transaction ledger logs.</div>
            </div>
          </section>

          <section style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0 }}>2. How We Use Information</h2>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              Your campaign URLs are used solely to execute views and engagement pacing tasks through our independent S-curve delivery network. We never sell, rent, or profile your personal data or campaign targets.
            </p>
          </section>

          <section style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0 }}>3. Data Security & Encryption</h2>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              All database inputs (including passwords and wallet transactions) are stored securely in PostgreSQL using cryptographic hashing and strict row-level security. Communication with delivery routers runs via encrypted TLS protocols.
            </p>
          </section>

          <section style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0 }}>4. Policy Updates</h2>
            <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.7 }}>
              We may update our Privacy Policy periodically to reflect infrastructure enhancements or regulatory guidelines. Continued use of the platform constitutes agreement to the current policies.
            </p>
          </section>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 16 }}>
          <Link href="/terms" className="neo-btn" style={{ padding: "16px 32px", borderRadius: 16, fontWeight: 800, fontSize: 15, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>
            Terms of Service →
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
