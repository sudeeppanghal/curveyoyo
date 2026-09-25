import Link from "next/link";
import type { Metadata } from "next";
import { PublicNav, PublicFooter } from "../PublicHeaderFooter";
import { N } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Contact Us — YoyoSMM",
  description: "Get in touch with the YoyoSMM support team. We are here to help you scale your organic pacing campaigns.",
};



export default function ContactPage() {
  return (
    <div style={{ background: N.bg, color: N.text, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        .neo-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; items-center; justify-content: center; }
        .neo-btn:hover { transform: translateY(-1px); box-shadow: 10px 10px 20px #c8d0e7, -10px -10px 20px #ffffff !important; }
        .neo-btn:active { transform: translateY(0); box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important; }
        @media (min-width: 768px) {
          .contact-grid { display: grid !important; grid-template-columns: 1fr 1.2fr !important; gap: 32px !important; }
        }
      `}</style>
      
      <PublicNav />

      {/* Main Content Container */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 24px 40px", display: "flex", flexDirection: "column", gap: 40 }}>
        
        {/* Header Section */}
        <div>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: "rgba(217,119,6,0.1)", color: N.accent, border: `1px solid rgba(217,119,6,0.3)`, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            ◆ We Are Here To Help
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: N.text, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 1.2 }}>
            Contact Us
          </h1>
          <p style={{ fontSize: 16, fontWeight: 600, color: N.muted, margin: 0 }}>
            Have questions about S-curve timing or need custom API integration assistance? Reach out to our 24/7 team.
          </p>
        </div>

        {/* Grid Container */}
        <div className="contact-grid" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Card 1: Support channels */}
          <div style={{ padding: 36, borderRadius: 28, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0 }}>Support Channels</h2>
            
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>📧 General Inquiries</div>
              <a href="mailto:hello@yoyosmm.online" style={{ fontSize: 16, fontWeight: 800, color: N.accent, textDecoration: "none" }}>hello@yoyosmm.online</a>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>⚡ Technical Support</div>
              <a href="mailto:support@yoyosmm.online" style={{ fontSize: 16, fontWeight: 800, color: N.accent, textDecoration: "none" }}>support@yoyosmm.online</a>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>🐛 Bug & Security Reports</div>
              <a href="mailto:bugs@yoyosmm.online" style={{ fontSize: 16, fontWeight: 800, color: N.accent, textDecoration: "none" }}>bugs@yoyosmm.online</a>
            </div>

            <div style={{ padding: 20, borderRadius: 16, background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: N.accent, marginBottom: 4 }}>⚡ Average Response Time</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: N.text }}>Under 2 hours (24/7 Global Support)</div>
            </div>
          </div>

          {/* Card 2: Interactive Contact Form */}
          <div style={{ padding: 36, borderRadius: 28, background: N.bg, boxShadow: N.raised }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: "0 0 20px" }}>Send a Direct Message</h2>
            <form style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Your Name</label>
                <input type="text" placeholder="John Doe" required style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: N.bg, boxShadow: N.inset, fontSize: 14, fontWeight: 600, color: N.text, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Your Email</label>
                <input type="email" placeholder="john@example.com" required style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: N.bg, boxShadow: N.inset, fontSize: 14, fontWeight: 600, color: N.text, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Message</label>
                <textarea rows={4} placeholder="How can we help you scale your campaigns?" required style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: N.bg, boxShadow: N.inset, fontSize: 14, fontWeight: 600, color: N.text, outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>
              <button type="submit" className="neo-btn" style={{ padding: 16, border: "none", borderRadius: 14, background: N.accentBg, color: "#ffffff", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: N.raisedSm, marginTop: 8 }}>
                Send Message →
              </button>
            </form>
          </div>

        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
          <Link href="/" className="neo-btn" style={{ padding: "16px 32px", borderRadius: 16, fontWeight: 700, fontSize: 15, color: N.text, background: N.bg, boxShadow: N.raised }}>
            ← Back to Home
          </Link>
        </div>

      </div>
      <PublicFooter />
    </div>
  );
}
