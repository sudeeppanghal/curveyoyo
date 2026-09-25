"use client";
import { useEffect, useRef } from "react";
import { N } from "@/lib/theme";

const MAX_CHUNK_RELOADS = 5;
const CHUNK_RELOAD_COUNT_KEY = "yoyo_chunk_reload_count";
const CHUNK_RELOAD_TS_KEY = "yoyo_chunk_reload_ts";
const RESET_WINDOW_MS = 120_000; // Reset counter after 2 minutes

function isChunkLoadError(error: Error): boolean {
  const msg  = (error?.message  ?? "").toLowerCase();
  const name = (error?.name     ?? "").toLowerCase();
  // Next.js App Router sometimes encodes the original message in error.digest
  const digest = ((error as unknown as Record<string, string>).digest ?? "").toLowerCase();
  return (
    name === "chunkloaderror"                    ||
    msg.includes("failed to load chunk")         ||
    msg.includes("loading chunk")                ||
    msg.includes("load chunk")                   ||
    msg.includes("/_next/static/chunks/")        ||
    msg.includes("cannot find module")           ||
    digest.includes("chunk")
  );
}

function doHardReload(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const now = Date.now();
    const lastTs  = parseInt(sessionStorage.getItem(CHUNK_RELOAD_TS_KEY)    ?? "0", 10);
    const rawCount = parseInt(sessionStorage.getItem(CHUNK_RELOAD_COUNT_KEY) ?? "0", 10);
    // If the last reload was more than 2 minutes ago, reset the counter
    const effectiveCount = now - lastTs > RESET_WINDOW_MS ? 0 : rawCount;
    if (effectiveCount >= MAX_CHUNK_RELOADS) {
      // Too many reloads in quick succession — bail to prevent infinite loop
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_COUNT_KEY, String(effectiveCount + 1));
    sessionStorage.setItem(CHUNK_RELOAD_TS_KEY,    String(now));
    // Hard navigation forces the browser to fetch fresh HTML + fresh chunk manifests
    const cleanPath = window.location.pathname + window.location.search;
    const sep       = cleanPath.includes("?") ? "&" : "?";
    window.location.href = cleanPath + sep + "_cb=" + now + window.location.hash;
    return true;
  } catch {
    // sessionStorage may be unavailable (private mode edge cases)
    window.location.reload();
    return true;
  }
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (isChunkLoadError(error) && !reloadedRef.current) {
      reloadedRef.current = true;
      const didReload = doHardReload();
      if (!didReload) {
        // Max retries exceeded — just call reset() as a last resort
        reset();
      }
    }
  }, [error, reset]);

  // For chunk errors: show a silent "refreshing" screen while the reload triggers
  if (isChunkLoadError(error)) {
    return (
      <html lang="en">
        <body
          style={{
            background: N.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            margin: 0,
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", padding: 48 }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #d97706",
                borderRadius: "50%",
                margin: "0 auto 20px",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p
              style={{
                color: N.muted,
                fontWeight: 700,
                fontSize: 16,
                margin: 0,
              }}
            >
              Refreshing page…
            </p>
          </div>
        </body>
      </html>
    );
  }

  // Non-chunk errors — show the standard error UI
  return (
    <html lang="en">
      <body
        style={{
          background: N.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          fontFamily: "'Inter', -apple-system, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            padding: 48,
            borderRadius: 32,
            background: N.bg,
            boxShadow: N.raised,
            textAlign: "center",
            maxWidth: 480,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 56, lineHeight: 1 }}>⚡</div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: N.text,
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: N.muted,
              fontSize: 15,
              fontWeight: 600,
              margin: "0 0 12px",
              lineHeight: 1.6,
            }}
          >
            {error.message ||
              "An unexpected system error occurred in our delivery pipeline."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "14px 32px",
              background: N.accentBg,
              color: "#fff",
              border: "none",
              borderRadius: 16,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: N.raisedSm,
            }}
          >
            Try Again →
          </button>
        </div>
      </body>
    </html>
  );
}
