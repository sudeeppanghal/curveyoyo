"use client";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0B0B0F", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0, fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⚡</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>{error.message || "An unexpected error occurred"}</p>
          <button onClick={reset} style={{ padding: "12px 28px", background: "#F59E0B", color: "#0B0B0F", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
