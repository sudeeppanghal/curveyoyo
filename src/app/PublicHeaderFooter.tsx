"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  insetSm:  "inset 3px 3px 6px #c8d0e7, inset -3px -3px 6px #ffffff",
  accent:   "#d97706",
  accentBg: "linear-gradient(135deg, #d97706, #ea580c)",
  text:     "#2d3748",
  muted:    "#718096",
  faint:    "#a0aec0",
  border:   "rgba(200, 208, 231, 0.4)",
};

export function PublicNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      borderBottom: `1px solid ${N.border}`,
      background: "rgba(238,242,247,0.92)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      backdropFilter: "blur(16px)",
      boxShadow: "0 4px 20px rgba(200, 208, 231, 0.25)"
    }}>
      <style>{`
        .pub-nav-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; items-center; justify-content: center; }
        .pub-nav-btn:hover { transform: translateY(-1px); box-shadow: 8px 8px 18px #c8d0e7, -8px -8px 18px #ffffff !important; }
        .pub-nav-link:hover { color: #d97706 !important; }
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/logo.png" alt="YoyoSMM Logo" style={{ width: 42, height: 42, objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }} />
          <span style={{ fontWeight: 850, fontSize: 22, color: N.text, letterSpacing: "-0.5px" }}>YoyoSMM</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 6, background: N.bg, padding: "6px 12px", borderRadius: 999, boxShadow: N.insetSm }}>
          {[
            ["Home", "/"],
            ["Features", "/features/organic-delivery-engine"],
            ["About", "/about"],
            ["FAQ", "/faq"],
            ["Blog", "/blog"],
            ["Contact", "/contact"],
          ].map(([label, href]) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className="pub-nav-link"
                style={{
                  color: active ? N.accent : N.muted,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 800 : 600,
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: active ? N.bg : "transparent",
                  boxShadow: active ? N.raisedSm : "none",
                  transition: "all 0.2s"
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/login" style={{ color: N.muted, textDecoration: "none", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 10 }} className="pub-nav-btn">
            Sign In
          </Link>
          <Link href="/signup" className="pub-nav-btn" style={{ padding: "10px 22px", borderRadius: 10, fontWeight: 800, fontSize: 13, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>
            Get Started →
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer style={{ background: N.bg, borderTop: `1px solid ${N.border}`, padding: "60px 24px 32px", marginTop: 40, boxShadow: "0 -10px 30px rgba(200, 208, 231, 0.2)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 36, marginBottom: 48 }}>
          <div>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 14 }}>
              <img src="/logo.png" alt="YoyoSMM Logo" style={{ width: 36, height: 36, objectFit: "contain" }} />
              <span style={{ fontWeight: 850, fontSize: 18, color: N.text }}>YoyoSMM</span>
            </Link>
            <p style={{ fontSize: 13, color: N.muted, lineHeight: 1.7, margin: 0, fontWeight: 500, maxWidth: 260 }}>
              The premium independent organic SMM panel with built-in timing layers. Zero upfront fees, direct wholesale pricing, and 99.98% delivery success rates.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: N.text, marginBottom: 16 }}>Product</div>
            {[
              ["Organic Delivery Engine", "/features/organic-delivery-engine"],
              ["Why We Beat Other Panels", "/#benchmark"],
              ["Pricing & Services", "/#pricing"],
              ["Interactive FAQ", "/faq"],
            ].map(([l, h]) => (
              <Link key={l} href={h} style={{ display: "block", fontSize: 13, color: N.muted, textDecoration: "none", marginBottom: 10, fontWeight: 600 }}>{l}</Link>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: N.text, marginBottom: 16 }}>Company</div>
            {[
              ["About Us", "/about"],
              ["Our Blog & Guides", "/blog"],
              ["Contact Helpdesk", "/contact"],
              ["Live Support Tickets", "/tickets"],
            ].map(([l, h]) => (
              <Link key={l} href={h} style={{ display: "block", fontSize: 13, color: N.muted, textDecoration: "none", marginBottom: 10, fontWeight: 600 }}>{l}</Link>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: N.text, marginBottom: 16 }}>Legal</div>
            {[
              ["Terms of Service", "/terms"],
              ["Privacy Policy", "/privacy"],
              ["Refund & Wallet Policy", "/terms#refunds"],
            ].map(([l, h]) => (
              <Link key={l} href={h} style={{ display: "block", fontSize: 13, color: N.muted, textDecoration: "none", marginBottom: 10, fontWeight: 600 }}>{l}</Link>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${N.border}`, paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: N.muted, fontWeight: 600, margin: 0 }}>© {new Date().getFullYear()} YoyoSMM · www.yoyosmm.online · Independent Wholesale Pacing Panel.</p>
          <p style={{ fontSize: 12, color: N.muted, fontWeight: 600, margin: 0 }}>Built with ❤️ for independent creators worldwide</p>
        </div>
      </div>
    </footer>
  );
}
