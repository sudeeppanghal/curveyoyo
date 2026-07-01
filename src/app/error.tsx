"use client";

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  accentBg: "linear-gradient(135deg, #d97706, #ea580c)",
  text:     "#2d3748",
  muted:    "#718096",
};

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: N.bg, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0, fontFamily: "'Inter', -apple-system, sans-serif", padding: 24 }}>
        <div style={{ padding: 48, borderRadius: 32, background: N.bg, boxShadow: N.raised, textAlign: "center", maxWidth: 480, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>⚡</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>Something went wrong</h1>
          <p style={{ color: N.muted, fontSize: 15, fontWeight: 600, margin: "0 0 12px", lineHeight: 1.6 }}>{error.message || "An unexpected system error occurred in our delivery pipeline."}</p>
          <button onClick={reset} style={{ padding: "14px 32px", background: N.accentBg, color: "#fff", border: "none", borderRadius: 16, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: N.raisedSm }}>
            Try Again →
          </button>
        </div>
      </body>
    </html>
  );
}
