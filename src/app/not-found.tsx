import Link from "next/link";
import { N } from "@/lib/theme";



export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: N.bg, fontFamily: "'Inter', -apple-system, sans-serif", padding: 24 }}>
      <style>{`
        .neo-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; items-center; justify-content: center; }
        .neo-btn:hover { transform: translateY(-1px); box-shadow: 10px 10px 20px #c8d0e7, -10px -10px 20px #ffffff !important; }
        .neo-btn:active { transform: translateY(0); box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important; }
      `}</style>
      <div style={{ padding: 48, borderRadius: 32, background: N.bg, boxShadow: N.raised, textAlign: "center", maxWidth: 480, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 72, fontWeight: 900, background: N.accentBg, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1, letterSpacing: "-3px" }}>
          404
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>Page Not Found</h1>
        <p style={{ fontSize: 15, fontWeight: 600, color: N.muted, margin: "0 0 12px", lineHeight: 1.6 }}>This page doesn&apos;t exist or has been moved to a new route in our organic pacing engine.</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", width: "100%" }}>
          <Link href="/dashboard" className="neo-btn" style={{ padding: "14px 28px", borderRadius: 16, fontWeight: 800, fontSize: 14, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>
            Dashboard →
          </Link>
          <Link href="/" className="neo-btn" style={{ padding: "14px 28px", borderRadius: 16, fontWeight: 700, fontSize: 14, color: N.text, background: N.bg, boxShadow: N.raisedSm }}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
