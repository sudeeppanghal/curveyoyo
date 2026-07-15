"use client";
import { useEffect } from "react";
import { N } from "@/lib/theme";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    const isChunkError = /failed to load chunk|loading chunk/i.test(error.message || "");
    if (isChunkError) {
      console.warn("Chunk load error detected in Error Boundary. Auto-reloading page...");
      const lastReload = sessionStorage.getItem("last_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem("last_chunk_reload", now.toString());
        window.location.reload();
      }
    }
  }, [error]);

  const handleReset = () => {
    const isChunkError = /failed to load chunk|loading chunk/i.test(error.message || "");
    if (isChunkError) {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <html lang="en">
      <body style={{ background: N.bg, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0, fontFamily: "'Inter', -apple-system, sans-serif", padding: 24 }}>
        <div style={{ padding: 48, borderRadius: 32, background: N.bg, boxShadow: N.raised, textAlign: "center", maxWidth: 480, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>⚡</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>Something went wrong</h1>
          <p style={{ color: N.muted, fontSize: 15, fontWeight: 600, margin: "0 0 12px", lineHeight: 1.6 }}>{error.message || "An unexpected system error occurred in our delivery pipeline."}</p>
          <button onClick={handleReset} style={{ padding: "14px 32px", background: N.accentBg, color: "#fff", border: "none", borderRadius: 16, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: N.raisedSm }}>
            Try Again →
          </button>
        </div>
      </body>
    </html>
  );
}

