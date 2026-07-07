"use client";
import { useState, useEffect } from "react";
import { N } from "@/lib/theme";

interface HistoryItem {
  id: string;
  title: string;
  url: string;
  timestamp: string;
  downloadUrl: string;
  mode: string;
}

export default function ShortsConverterPage() {
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");
  const [url, setUrl] = useState("");
  const [start, setStart] = useState("00:00");
  const [duration, setDuration] = useState(30);
  const [aspect, setAspect] = useState("9:16");
  const [reframe, setReframe] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [previewUrl, setPreviewUrl] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [autoShorts, setAutoShorts] = useState<any[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("yoyo_shorts_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load shorts history:", e);
    }
  }, []);

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("yoyo_shorts_history", JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save shorts history:", e);
    }
  };

  const handleConvert = async () => {
    setErrorMsg("");
    setPreviewUrl("");
    setAutoShorts([]);
    
    if (!url) {
      setErrorMsg("Please enter a video URL.");
      return;
    }

    setLoading(true);
    setProgressText(
      activeTab === "manual"
        ? "Processing video stream. Running face-tracking reframer (~15-45 seconds)..."
        : "Extracting video captions, prompting Gemini AI, and reframing multiple shorts (~45-90 seconds)..."
    );

    try {
      const res = await fetch("/api/tools/convert-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          start,
          duration,
          aspect,
          reframe,
          mode: activeTab,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data && data.success) {
        if (activeTab === "manual" && data.downloadUrl) {
          setPreviewUrl(data.downloadUrl);
          
          // Add to local history
          const newItem: HistoryItem = {
            id: data.jobId || Math.random().toString(),
            title: `Trimmed Clip (${start} - ${duration}s)`,
            url,
            timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloadUrl: data.downloadUrl,
            mode: "Manual",
          };
          saveHistory([newItem, ...history]);
        } else if (activeTab === "auto" && data.shorts) {
          setAutoShorts(data.shorts);
          
          // Add all generated shorts to local history
          const newItems: HistoryItem[] = data.shorts.map((short: any, idx: number) => ({
            id: `${data.jobId || Math.random().toString()}_${idx}`,
            title: short.title || `AI Short #${idx + 1}`,
            url,
            timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloadUrl: short.downloadUrl,
            mode: "AI Auto",
          }));
          saveHistory([...newItems, ...history]);
        }
      } else {
        setErrorMsg(data.error || "An error occurred during video conversion.");
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg("Failed to connect to the conversion service. Please try again.");
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your local clip history?")) {
      saveHistory([]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1100, animation: "fadeUp 0.3s ease-out" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
          AI Shorts Studio
        </h1>
        <p style={{ fontSize: 13, color: N.muted, margin: 0, fontWeight: 600 }}>
          Trim, reframe, and compile horizontal videos into vertical shorts using fast Hugging Face processing.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 28, alignItems: "start" }} className="lg:grid-cols-[1.1fr_0.9fr]">
        
        {/* Left Control Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Mode Switcher */}
          <div style={{ borderRadius: 16, padding: 6, background: N.bg, boxShadow: N.inset, display: "flex", gap: 4 }}>
            <button
              onClick={() => { setActiveTab("manual"); setErrorMsg(""); }}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer",
                background: activeTab === "manual" ? N.bg : "transparent",
                color: activeTab === "manual" ? N.accent : N.muted,
                boxShadow: activeTab === "manual" ? N.raisedSm : "none",
                transition: "all 0.2s"
              }}
            >
              Manual Trimmer & Crop
            </button>
            <button
              onClick={() => { setActiveTab("auto"); setErrorMsg(""); }}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer",
                background: activeTab === "auto" ? N.bg : "transparent",
                color: activeTab === "auto" ? N.accent : N.muted,
                boxShadow: activeTab === "auto" ? N.raisedSm : "none",
                transition: "all 0.2s"
              }}
            >
              AI Auto-Shorts (Gemini)
            </button>
          </div>

          {/* Form Card */}
          <div style={{ borderRadius: 20, padding: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Input URL */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", letterSpacing: "1px" }}>
                Video Link
              </label>
              <input
                type="text"
                placeholder="YouTube, Google Drive, Facebook, TikTok URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 600,
                  background: N.bg, color: N.text, boxShadow: N.inset, outline: "none"
                }}
                className="neo-input"
              />
            </div>

            {/* Manual Mode Params */}
            {activeTab === "manual" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", letterSpacing: "1px" }}>
                    Start Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 01:20 or 80"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 600,
                      background: N.bg, color: N.text, boxShadow: N.inset, outline: "none"
                    }}
                    className="neo-input"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", letterSpacing: "1px" }}>
                    Duration (Seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                    style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 600,
                      background: N.bg, color: N.text, boxShadow: N.inset, outline: "none"
                    }}
                    className="neo-input"
                  />
                </div>
              </div>
            )}

            {/* Layout Aspect Ratio */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase", letterSpacing: "1px" }}>
                Aspect Ratio
              </label>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value)}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 600,
                  background: N.bg, color: N.text, boxShadow: N.raisedSm, outline: "none", cursor: "pointer"
                }}
              >
                <option value="9:16">Vertical (9:16) - Shorts/Reels/TikTok</option>
                <option value="1:1">Square (1:1) - Instagram Post</option>
                <option value="16:9">Landscape (16:9) - Standard Trimmer</option>
              </select>
            </div>

            {/* Face Tracking Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, background: N.bg, boxShadow: N.inset }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: N.text }}>AI Face-Tracking Auto Reframe</div>
                <div style={{ fontSize: 11, color: N.muted, marginTop: 2, fontWeight: 550 }}>Pans the camera smoothly following the speaker</div>
              </div>
              <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={reframe}
                  onChange={(e) => setReframe(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, transition: "all 0.3s",
                  background: reframe ? N.accent : "rgba(0,0,0,0.15)",
                  boxShadow: reframe ? "none" : N.insetSm
                }}>
                  <span style={{
                    position: "absolute", left: 3, bottom: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "all 0.3s",
                    transform: reframe ? "translateX(20px)" : "translateX(0)"
                  }} />
                </span>
              </label>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)", color: "#dc2626", fontSize: 12, fontWeight: 600 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleConvert}
              disabled={loading}
              style={{
                width: "100%", padding: "16px", borderRadius: 14, border: "none", fontSize: 14, fontWeight: 800, color: "#fff",
                background: loading ? "#718096" : N.accentBg,
                boxShadow: loading ? "none" : N.raisedSm,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
              className={loading ? "" : "neo-btn"}
            >
              {loading ? "Processing..." : activeTab === "manual" ? "Crop Video" : "Find AI Moments & Crop"}
            </button>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Main Output Box */}
          <div style={{
            borderRadius: 20, padding: 24, background: N.bg, boxShadow: N.raised, minHeight: 410,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative"
          }}>
            
            {/* Default Placeholder */}
            {!loading && !previewUrl && autoShorts.length === 0 && (
              <div style={{ textAlign: "center", color: N.faint }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🎬</div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: N.text, margin: "0 0 6px" }}>Ready to Studio</h4>
                <p style={{ fontSize: 12, color: N.muted, maxWidth: 280, margin: 0, lineHeight: 1.6, fontWeight: 600 }}>
                  Enter your video link on the left to start reframing or auto-generating viral moments.
                </p>
              </div>
            )}

            {/* Loader State */}
            {loading && (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 48, height: 48, border: `4px solid ${N.border}`, borderTopColor: N.accent, borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                <p style={{ fontSize: 12, color: N.text, fontWeight: 700, maxWidth: 260, lineHeight: 1.6 }}>
                  {progressText}
                </p>
              </div>
            )}

            {/* Manual Single Video Output */}
            {!loading && previewUrl && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                <video src={previewUrl} controls autoPlay loop muted style={{
                  maxWidth: 240, width: "100%", maxHeight: 320, borderRadius: 14, background: "#000", border: `1px solid ${N.border}`,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                }} />
                <a href={previewUrl} target="_blank" download className="neo-btn" style={{
                  padding: "12px 24px", borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: "none", color: "#fff",
                  background: "#16a34a", boxShadow: N.raisedSm, width: "100%", textAlign: "center"
                }}>
                  Download Clip
                </a>
              </div>
            )}

            {/* Auto AI Multi Video List Output */}
            {!loading && autoShorts.length > 0 && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 15 }}>
                <h3 style={{ fontSize: 14, fontWeight: 900, color: N.text, margin: 0 }}>AI Generated Shorts</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                  {autoShorts.map((short, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12,
                      background: N.bg, boxShadow: N.inset, gap: 10
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: N.text }}>{short.title}</div>
                        <div style={{ fontSize: 10, color: N.muted, fontWeight: 600 }}>Start: {short.start} | {short.duration}s</div>
                      </div>
                      <a href={short.downloadUrl} target="_blank" download className="neo-btn" style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 800, textDecoration: "none", color: "#fff",
                        background: "#16a34a", boxShadow: N.raisedSm
                      }}>
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Log Card */}
      {history.length > 0 && (
        <div style={{ borderRadius: 20, padding: 24, background: N.bg, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, color: N.text, margin: 0 }}>Your Generated Clips</h3>
            <button
              onClick={handleClearHistory}
              style={{ background: "transparent", border: "none", color: "#dc2626", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
            >
              Clear History
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }} className="md:grid-cols-2">
            {history.map((item) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 12,
                background: N.bg, boxShadow: N.inset, gap: 12
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: N.text }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: N.muted, fontWeight: 600 }}>Mode: {item.mode} · Generated {item.timestamp}</div>
                </div>
                <a
                  href={item.downloadUrl}
                  target="_blank"
                  download
                  className="neo-btn"
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 800, textDecoration: "none", color: N.text,
                    background: N.bg, boxShadow: N.raisedSm
                  }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
