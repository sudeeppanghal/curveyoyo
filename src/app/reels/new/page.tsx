"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { curveForChart, calculateEngagementTargets } from "@/lib/delivery/curve";

// ── Types ───────────────────────────────────────────────────────
type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
type CurveStyle = "ORGANIC" | "FAST" | "AGGRESSIVE" | "WHOP" | "CLIPSTAKE" | "CLIPSTAR" | "PICSART" | "CROSSWAVE";

interface Panel {
  id: string; name: string; isActive: boolean;
  serviceIds: Record<string, Record<string, string>> | null;
}

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  raisedLg: "14px 14px 28px #c8d0e7, -14px -14px 28px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  accentBg: "linear-gradient(135deg, #d97706, #ea580c)",
  text:     "#2d3748",
  muted:    "#718096",
  faint:    "#a0aec0",
  border:   "rgba(200, 208, 231, 0.4)",
};

const PLATFORM_ICONS: Record<Platform, string> = {
  INSTAGRAM: "📷", TIKTOK: "🎵", YOUTUBE: "▶️",
};
const CURVE_DESCRIPTIONS: Record<CurveStyle, { label: string; desc: string; warmup: number; peak: number; icon: string }> = {
  ORGANIC:    { label: "Organic",    desc: "Natural viral growth — slow warmup, steady peak, smooth decay. Best for account health.", warmup: 4, peak: 8, icon: "🌅" },
  FAST:       { label: "Fast",       desc: "Compressed 12h curve — quicker ramp, shorter peak. Good for time-sensitive content.", warmup: 2, peak: 4, icon: "⚡" },
  AGGRESSIVE: { label: "Aggressive", desc: "Rapid 6h burst — immediate surge. Use sparingly, higher visibility risk.", warmup: 1, peak: 2, icon: "🔥" },
  WHOP:       { label: "Whop",       desc: "Steady commerce pacing — slow morning warmup with sustained midday activity plateau.", warmup: 5, peak: 10, icon: "💳" },
  CLIPSTAKE:  { label: "Clipstake",  desc: "Algorithmic step-wise wave pacing — spikes at 35% and 70% of duration to mimic viral prompts.", warmup: 3, peak: 6, icon: "🎲" },
  CLIPSTAR:   { label: "Clipstar",   desc: "Immediate sustained viral burst — quick warmup with long-tail plateau retention.", warmup: 2, peak: 12, icon: "⭐" },
  PICSART:    { label: "Picsart",    desc: "Creative designer pacing — afternoon peak with high interaction curves.", warmup: 4, peak: 8, icon: "🎨" },
  CROSSWAVE:  { label: "Crosswave",  desc: "Periodic multi-platform cross pacing — oscillatory crest/trough waves simulating syndication.", warmup: 4, peak: 8, icon: "🌊" },
};

// ── Mini SVG Chart ───────────────────────────────────────────────
function CurvePreview({
  views, durationHours, style, warmup, peak,
  likesRatio, savesRatio,
}: {
  views: number; durationHours: number; style: CurveStyle; warmup: number; peak: number;
  likesRatio: number; savesRatio: number;
}) {
  const points = curveForChart({ totalViews: views, durationHours, style, warmupHours: warmup, peakHours: peak });
  if (!points.length) return null;
  const W = 400, H = 100, pad = 8;
  const maxViews = Math.max(...points.map((p) => p.views), 1);
  const pts = points.map((p, i) => ({
    x: pad + (i / Math.max(points.length - 1, 1)) * (W - 2 * pad),
    y: H - pad - (p.views / maxViews) * (H - 2 * pad),
  }));
  const likesPts = points.map((p, i) => ({
    x: pad + (i / Math.max(points.length - 1, 1)) * (W - 2 * pad),
    y: H - pad - ((p.likes ?? 0) / Math.max(...points.map((q) => q.likes ?? 0), 1)) * (H - 2 * pad),
  }));
  const line = (arr: { x: number; y: number }[]) =>
    arr.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const fill = (arr: { x: number; y: number }[], last: number) =>
    [line(arr), `L ${arr.at(-1)!.x.toFixed(1)} ${last}`, `L ${arr[0].x.toFixed(1)} ${last} Z`].join(" ");

  return (
    <div style={{ marginTop:16, borderRadius:14, overflow:"hidden", background:N.bg, padding:"12px 16px", boxShadow:N.inset }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Views */}
        <path d={fill(pts, H - pad)} fill="url(#vg)" />
        <path d={line(pts)} fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Likes overlay */}
        {likesRatio > 0 && (
          <>
            <path d={fill(likesPts, H - pad)} fill="url(#lg)" />
            <path d={line(likesPts)} fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
          </>
        )}
      </svg>
      <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:8, fontSize:11 }}>
        <span style={{ display:"flex", alignItems:"center", gap:6, color:N.muted, fontWeight:700 }}><span style={{ width:12, height:3, borderRadius:4, display:"inline-block", background:"#d97706" }} /> Views</span>
        {likesRatio > 0 && <span style={{ display:"flex", alignItems:"center", gap:6, color:N.muted, fontWeight:700 }}><span style={{ width:12, height:3, borderRadius:4, display:"inline-block", background:"#16a34a" }} /> Likes</span>}
      </div>
    </div>
  );
}

// ── Slider ───────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 1, onChange, format }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:13, fontWeight:700, color:N.text }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:900, color:N.accent }}>{format(value)}</span>
      </div>
      <div style={{ padding:"8px", borderRadius:12, background:N.bg, boxShadow:N.inset }}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ width:"100%", accentColor:N.accent, cursor:"pointer", display:"block" }} />
      </div>
    </div>
  );
}

// ── Engagement toggle row ─────────────────────────────────────────
function EngRow({ icon, label, enabled, ratio, maxRatio, count, onToggle, onRatio }: {
  icon: string; label: string; enabled: boolean; ratio: number;
  maxRatio: number; count: number; onToggle: () => void; onRatio: (v: number) => void;
}) {
  return (
    <div style={{ borderRadius:16, padding:16, background:N.bg, boxShadow: enabled ? N.raisedSm : N.inset, transition:"all 0.2s" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: enabled ? 16 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>{icon}</span>
          <span style={{ fontSize:13, fontWeight:800, color:N.text }}>{label}</span>
          {enabled && <span style={{ fontSize:12, color:N.accent, fontWeight:800 }}>→ {count.toLocaleString()}</span>}
        </div>
        <button onClick={onToggle} className="neo-btn"
          style={{ width:40, height:22, borderRadius:12, border:"none", cursor:"pointer", position:"relative", transition:"all 0.2s", background: enabled ? N.accent : "#cbd5e1", boxShadow:N.raisedSm }}>
          <div style={{ width:14, height:14, borderRadius:"50%", background:"#ffffff", top:4, left: enabled ? 22 : 4, position:"absolute", transition:"all 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
      </div>
      {enabled && (
        <Slider label={`${ratio.toFixed(1)}% of views`} value={ratio} min={0.1} max={maxRatio} step={0.1}
          onChange={onRatio} format={(v) => `${v.toFixed(1)}%`} />
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function NewReelPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Bulk Mode state
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState(false);

  // Step 1
  const [platform, setPlatform] = useState<Platform>("INSTAGRAM");
  const [reelUrl, setReelUrl] = useState("");

  // Step 2
  const [views, setViews] = useState(10000);
  const [durationDays, setDurationDays] = useState(7);
  const [style, setStyle] = useState<CurveStyle>("ORGANIC");

  // Step 3 ── Engagement
  const [engEnabled, setEngEnabled] = useState(true);
  const [likesOn, setLikesOn] = useState(true);
  const [savesOn, setSavesOn] = useState(true);
  const [sharesOn, setSharesOn] = useState(false);
  const [commentsOn, setCommentsOn] = useState(false);
  const [likesRatio, setLikesRatio] = useState(4.0);
  const [savesRatio, setSavesRatio] = useState(2.0);
  const [sharesRatio, setSharesRatio] = useState(0.5);
  const [commentsRatio, setCommentsRatio] = useState(0.2);
  const [hasCustomizedEng, setHasCustomizedEng] = useState(false);

  useEffect(() => {
    fetch("/api/panels").then((r) => r.json()).then((d) => setPanels(d.panels ?? [])).catch(() => {});
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.templates ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (hasCustomizedEng) return;
    if (views < 5000) {
      setLikesRatio(6.0); setSavesRatio(3.0); setSharesRatio(0.8); setCommentsRatio(0.3);
    } else if (views <= 50000) {
      setLikesRatio(4.0); setSavesRatio(2.0); setSharesRatio(0.5); setCommentsRatio(0.2);
    } else {
      setLikesRatio(2.0); setSavesRatio(1.0); setSharesRatio(0.2); setCommentsRatio(0.1);
    }
  }, [views, hasCustomizedEng]);

  const applyTemplate = (templateId: string) => {
    const t = templates.find((tmp) => tmp.id === templateId);
    if (!t) return;
    setSelectedTemplateId(templateId);
    setStyle(t.style);
    setDurationDays(Math.max(1, Math.round(t.durationHours / 24)));
    setLikesRatio(t.likesRatioPct);
    setSavesRatio(t.savesRatioPct);
    setSharesRatio(t.sharesRatioPct);
    setCommentsRatio(t.commentsRatioPct);

    const anyEng = t.likesRatioPct > 0 || t.savesRatioPct > 0 || t.sharesRatioPct > 0 || t.commentsRatioPct > 0;
    setEngEnabled(anyEng);
    setLikesOn(t.likesRatioPct > 0);
    setSavesOn(t.savesRatioPct > 0);
    setSharesOn(t.sharesRatioPct > 0);
    setCommentsOn(t.commentsRatioPct > 0);
    setHasCustomizedEng(true);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { setBulkError("CSV must contain headers and at least one data row"); return; }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const expectedHeaders = ["url", "platform", "views", "duration_days", "curve_style"];
        const missing = expectedHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) { setBulkError(`Missing headers: ${missing.join(", ")}`); return; }

        const rows = lines.slice(1).map((line, idx) => {
          const vals = line.split(",").map(v => v.trim());
          const rowObj: any = { id: idx + 1 };
          headers.forEach((h, index) => { rowObj[h] = vals[index]; });

          rowObj.viewsVal = parseInt(rowObj.views) || 0;
          rowObj.durDays = parseInt(rowObj.duration_days) || 7;
          rowObj.styleVal = (rowObj.curve_style || "ORGANIC").toUpperCase();
          rowObj.isValid = rowObj.url && ["INSTAGRAM", "TIKTOK", "YOUTUBE"].includes((rowObj.platform || "").toUpperCase()) && rowObj.viewsVal >= 100 && rowObj.durDays >= 1;
          return rowObj;
        });

        setBulkRows(rows);
      } catch (err) {
        setBulkError("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  };

  const triggerBulkCampaigns = async () => {
    const validRows = bulkRows.filter(r => r.isValid);
    if (!validRows.length) { setBulkError("No valid rows to schedule"); return; }
    setSubmitting(true);
    setBulkProgress({ current: 0, total: validRows.length });

    let count = 0;
    for (const row of validRows) {
      try {
        const platformUpper = row.platform.toUpperCase();
        const likesPct = parseFloat(row.likes_pct) || 0;
        const savesPct = parseFloat(row.saves_pct) || 0;
        const sharesPct = parseFloat(row.shares_pct) || 0;
        const commentsPct = parseFloat(row.comments_pct) || 0;

        const viewsTarget = row.viewsVal;
        const likesTarget = Math.round((likesPct / 100) * viewsTarget);
        const savesTarget = Math.round((savesPct / 100) * viewsTarget);
        const sharesTarget = Math.round((sharesPct / 100) * viewsTarget);
        const commentsTarget = Math.round((commentsPct / 100) * viewsTarget);
        const engagementEnabled = likesTarget > 0 || savesTarget > 0 || sharesTarget > 0 || commentsTarget > 0;

        let warmup = 4, peak = 8;
        if (row.styleVal === "FAST") { warmup = 2; peak = 4; }
        if (row.styleVal === "AGGRESSIVE") { warmup = 1; peak = 2; }

        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reelUrl: row.url, platform: platformUpper, viewsTarget, durationHours: row.durDays * 24, curveStyle: row.styleVal,
            warmupHours: warmup, peakHours: peak, engagementEnabled, likesTarget, savesTarget, sharesTarget, commentsTarget,
            likesRatioPct: likesPct, savesRatioPct: savesPct, sharesRatioPct: sharesPct, commentsRatioPct: commentsPct,
          }),
        });
      } catch (e) {
        console.error("Bulk import failed for row:", row, e);
      }
      count++;
      setBulkProgress({ current: count, total: validRows.length });
    }

    setSubmitting(false); setBulkSuccess(true);
    setTimeout(() => { router.push("/orders"); }, 2000);
  };

  const downloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "url,platform,views,duration_days,curve_style,likes_pct,saves_pct,shares_pct,comments_pct\n"
      + "https://www.instagram.com/reel/CtK89s_gH9k,INSTAGRAM,10000,7,ORGANIC,4.0,2.0,0.5,0.2\n"
      + "https://www.tiktok.com/@user/video/712345678,TIKTOK,25000,14,FAST,3.0,1.5,0.2,0.1\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_campaigns_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const durationHours = durationDays * 24;
  const curveInfo = CURVE_DESCRIPTIONS[style];
  const eng = calculateEngagementTargets(
    views,
    engEnabled && likesOn ? likesRatio : 0,
    engEnabled && savesOn ? savesRatio : 0,
    engEnabled && sharesOn ? sharesRatio : 0,
    engEnabled && commentsOn ? commentsRatio : 0,
  );

  const canProceed1 = reelUrl.trim().length > 10;
  const canProceed2 = views >= 100 && durationDays >= 1;

  const submit = useCallback(async () => {
    setSubmitting(true); setError("");
    try {
      if (saveAsTemplate && templateName.trim()) {
        await fetch("/api/templates", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName.trim(), style, durationHours, warmupHours: curveInfo.warmup, peakHours: curveInfo.peak,
            decayHours: durationHours - curveInfo.warmup - curveInfo.peak,
            likesRatioPct: engEnabled && likesOn ? likesRatio : 0,
            savesRatioPct: engEnabled && savesOn ? savesRatio : 0,
            sharesRatioPct: engEnabled && sharesOn ? sharesRatio : 0,
            commentsRatioPct: engEnabled && commentsOn ? commentsRatio : 0,
          }),
        });
      }

      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reelUrl: reelUrl.trim(), platform, viewsTarget: views, durationHours, curveStyle: style, warmupHours: curveInfo.warmup, peakHours: curveInfo.peak,
          engagementEnabled: engEnabled, likesTarget: eng.likesTarget, savesTarget: eng.savesTarget, sharesTarget: eng.sharesTarget, commentsTarget: eng.commentsTarget,
          likesRatioPct: engEnabled && likesOn ? likesRatio : 0, savesRatioPct: engEnabled && savesOn ? savesRatio : 0,
          sharesRatioPct: engEnabled && sharesOn ? sharesRatio : 0, commentsRatioPct: engEnabled && commentsOn ? commentsRatio : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create order"); setSubmitting(false); return; }
      router.push(`/orders`);
    } catch (e) {
      setError(String(e)); setSubmitting(false);
    }
  }, [reelUrl, platform, views, durationHours, style, curveInfo, engEnabled, likesOn, savesOn, sharesOn, commentsOn, likesRatio, savesRatio, sharesRatio, commentsRatio, eng, router, saveAsTemplate, templateName]);

  return (
    <div style={{ maxWidth:640, display:"flex", flexDirection:"column", gap:24 }}>
      <style>{`
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-0.5px" }}>New Campaign</h1>
        <p style={{ fontSize:13, color:N.muted, margin:0, fontWeight:600 }}>Organic S-curve delivery with engagement</p>
      </div>

      {/* Mode Switcher */}
      <div style={{ display:"flex", gap:8, padding:6, borderRadius:16, background:N.bg, boxShadow:N.inset }}>
        <button onClick={() => setMode("single")}
          style={{ flex:1, border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, transition:"all 0.2s", fontFamily:"inherit",
            background: mode === "single" ? N.bg : "transparent",
            color: mode === "single" ? N.accent : N.muted,
            boxShadow: mode === "single" ? N.raisedSm : "none",
            padding:"10px"
          }}>
          Single Campaign
        </button>
        <button onClick={() => setMode("bulk")}
          style={{ flex:1, border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, transition:"all 0.2s", fontFamily:"inherit",
            background: mode === "bulk" ? N.bg : "transparent",
            color: mode === "bulk" ? N.accent : N.muted,
            boxShadow: mode === "bulk" ? N.raisedSm : "none",
            padding:"10px"
          }}>
          Bulk CSV Import
        </button>
      </div>

      {/* Single Mode Step 1 */}
      {mode === "single" && step === 1 && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.3s ease" }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>1. Content Link</h2>

          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Select Platform</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {(["INSTAGRAM", "TIKTOK", "YOUTUBE"] as Platform[]).map((p) => (
                <button key={p} onClick={() => setPlatform(p)} className="neo-btn"
                  style={{ padding:"12px 6px", borderRadius:12, border:"none", cursor:"pointer", transition:"all 0.2s",
                    background: N.bg,
                    color: platform === p ? N.accent : N.muted,
                    boxShadow: platform === p ? N.inset : N.raisedSm,
                    fontWeight:800, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", gap:6
                  }}>
                  <span>{PLATFORM_ICONS[p]}</span>
                  <span>{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Post / Reel URL</label>
            <input type="text" value={reelUrl} onChange={(e) => setReelUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..."
              style={{ width:"100%", padding:"12px 14px", borderRadius:12, fontSize:13, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"inherit" }}
              className="neo-input" />
          </div>

          <button onClick={() => setStep(2)} disabled={!canProceed1} className="neo-btn"
            style={{ width:"100%", padding:"14px", borderRadius:14, fontSize:14, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm, transition:"all 0.2s", opacity: canProceed1 ? 1 : 0.5, cursor: canProceed1 ? "pointer" : "not-allowed", marginTop:8 }}>
            Next: Views & Duration →
          </button>
        </div>
      )}

      {/* Single Mode Step 2 */}
      {mode === "single" && step === 2 && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.3s ease" }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>2. Views & Duration</h2>

          {templates.length > 0 && (
            <div style={{ borderRadius:16, padding:16, background:N.bg, boxShadow:N.inset }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Load Saved Preset</label>
              <select value={selectedTemplateId} onChange={(e) => applyTemplate(e.target.value)}
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, fontSize:13, background:N.bg, color:N.text, border:"none", outline:"none", boxShadow:N.raisedSm }} className="neo-btn">
                <option value="">-- Choose template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.style}, {t.durationHours}h)</option>
                ))}
              </select>
            </div>
          )}

          <Slider label="Total Views" value={views} min={1000} max={1000000} step={1000}
            onChange={setViews} format={(v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />

          <Slider label="Duration" value={durationDays} min={1} max={90} step={1}
            onChange={setDurationDays} format={(v) => `${v} day${v === 1 ? "" : "s"}`} />

          {views / durationDays > 5000 && (
            <div style={{ padding:14, borderRadius:14, background:"rgba(217,119,6,0.1)", color:N.accent, display:"flex", flexDirection:"column", gap:4, fontSize:12, fontWeight:600, boxShadow:N.inset }}>
              <span style={{ fontWeight:800 }}>⚠️ Safe Pacing Recommendation</span>
              <span>Delivering more than 5,000 views/day is best for active pages. Consider spreading this target over at least <strong>{Math.ceil(views / 5000)} days</strong> to ensure natural velocity.</span>
            </div>
          )}

          <div>
            <p style={{ fontSize:13, fontWeight:700, color:N.text, marginBottom:10 }}>Delivery Style</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:10 }}>
              {(["ORGANIC", "FAST", "AGGRESSIVE", "WHOP", "CLIPSTAKE", "CLIPSTAR", "PICSART", "CROSSWAVE"] as CurveStyle[]).map((s) => (
                <button key={s} onClick={() => { setStyle(s); setSelectedTemplateId(""); }} className="neo-btn"
                  style={{ padding:"14px 6px", borderRadius:14, border:"none", cursor:"pointer", transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                    background: N.bg,
                    color: style === s ? N.accent : N.muted,
                    boxShadow: style === s ? N.inset : N.raisedSm,
                  }}>
                  <span style={{ fontSize:18 }}>{CURVE_DESCRIPTIONS[s].icon}</span>
                  <span style={{ fontSize:12, fontWeight:800 }}>{CURVE_DESCRIPTIONS[s].label}</span>
                </button>
              ))}
            </div>
            <p style={{ fontSize:12, color:N.muted, marginTop:10, fontWeight:600, lineHeight:1.5 }}>{curveInfo.desc}</p>
          </div>

          <CurvePreview views={views} durationHours={durationHours} style={style} warmup={curveInfo.warmup} peak={curveInfo.peak} likesRatio={likesRatio} savesRatio={0} />

          <div style={{ fontSize:12, color:N.muted, textAlign:"center", fontWeight:600 }}>
            ≈ {Math.round(views / durationDays).toLocaleString()} views/day · {durationHours} hourly batches
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <button onClick={() => setStep(1)} style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }} className="neo-btn">← Back</button>
            <button onClick={() => setStep(3)} disabled={!canProceed2} className="neo-btn"
              style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm, opacity: canProceed2 ? 1 : 0.5 }}>
              Next: Engagement →
            </button>
          </div>
        </div>
      )}

      {/* Single Mode Step 3 */}
      {mode === "single" && step === 3 && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:16, animation:"fadeUp 0.3s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>3. Balanced Engagement</h2>
              <p style={{ fontSize:12, color:N.muted, marginTop:2, fontWeight:600 }}>Delivered concurrently along your views schedule</p>
            </div>
            <button onClick={() => setEngEnabled((v) => !v)} className="neo-btn"
              style={{ padding:"6px 14px", borderRadius:10, fontSize:11, fontWeight:800, border:"none", cursor:"pointer",
                background: N.bg,
                color: engEnabled ? N.accent : N.muted,
                boxShadow: engEnabled ? N.raisedSm : N.inset
              }}>
              {engEnabled ? "✓ Active" : "Disabled"}
            </button>
          </div>

          {engEnabled && (
            <>
              <div style={{ padding:12, borderRadius:12, background:"rgba(217,119,6,0.08)", fontSize:12, color:N.accent, fontWeight:600 }}>
                💡 Balanced engagement ratios improve reach. Benchmarks have been pre-set for your views target.
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <EngRow icon="👍" label="Likes" enabled={likesOn} ratio={likesRatio} maxRatio={15} count={eng.likesTarget} onToggle={() => { setLikesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setLikesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="🔖" label="Saves" enabled={savesOn} ratio={savesRatio} maxRatio={8} count={eng.savesTarget} onToggle={() => { setSavesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setSavesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="📤" label="Shares" enabled={sharesOn} ratio={sharesRatio} maxRatio={5} count={eng.sharesTarget} onToggle={() => { setSharesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setSharesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="💬" label="Comments" enabled={commentsOn} ratio={commentsRatio} maxRatio={3} count={eng.commentsTarget} onToggle={() => { setCommentsOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setCommentsRatio(v); setHasCustomizedEng(true); }} />
              </div>

              <div style={{ borderRadius:16, padding:18, background:N.bg, boxShadow:N.inset }}>
                <p style={{ fontSize:11, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Campaign Targets</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px", fontSize:13 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>👁 Views</span><span style={{ fontWeight:800, color:N.text }}>{views.toLocaleString()}</span></div>
                  {likesOn && eng.likesTarget > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>👍 Likes</span><span style={{ fontWeight:800, color:"#16a34a" }}>{eng.likesTarget.toLocaleString()}</span></div>}
                  {savesOn && eng.savesTarget > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>🔖 Saves</span><span style={{ fontWeight:800, color:"#16a34a" }}>{eng.savesTarget.toLocaleString()}</span></div>}
                  {sharesOn && eng.sharesTarget > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>📤 Shares</span><span style={{ fontWeight:800, color:"#16a34a" }}>{eng.sharesTarget.toLocaleString()}</span></div>}
                  {commentsOn && eng.commentsTarget > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>💬 Comments</span><span style={{ fontWeight:800, color:"#16a34a" }}>{eng.commentsTarget.toLocaleString()}</span></div>}
                </div>
              </div>
            </>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:8 }}>
            <button onClick={() => setStep(2)} style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }} className="neo-btn">← Back</button>
            <button onClick={() => setStep(4)} style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm }} className="neo-btn">
              Review Order →
            </button>
          </div>
        </div>
      )}

      {/* Single Mode Step 4 */}
      {mode === "single" && step === 4 && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.3s ease" }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>4. Confirm Campaign</h2>

          <CurvePreview views={views} durationHours={durationHours} style={style} warmup={curveInfo.warmup} peak={curveInfo.peak} likesRatio={engEnabled && likesOn ? likesRatio : 0} savesRatio={0} />

          <div style={{ display:"flex", flexDirection:"column", gap:10, padding:18, borderRadius:16, background:N.bg, boxShadow:N.inset }}>
            {[
              ["Platform", `${PLATFORM_ICONS[platform]} ${platform.charAt(0) + platform.slice(1).toLowerCase()}`],
              ["URL", reelUrl.length > 40 ? reelUrl.slice(0, 40) + "…" : reelUrl],
              ["Views Target", views.toLocaleString()],
              ["Duration", `${durationDays} day${durationDays === 1 ? "" : "s"} (${durationHours}h)`],
              ["Delivery Style", `${curveInfo.icon} ${curveInfo.label}`],
              ["Pacing Schedule", `${durationHours} hourly batches`],
              ...(engEnabled ? [
                ["Engagement Mode", "✅ Paced concurrently"],
                ...(likesOn && eng.likesTarget > 0 ? [["👍 Likes Target", `${eng.likesTarget.toLocaleString()} (${likesRatio}%)`]] : []),
                ...(savesOn && eng.savesTarget > 0 ? [["🔖 Saves Target", `${eng.savesTarget.toLocaleString()} (${savesRatio}%)`]] : []),
                ...(sharesOn && eng.sharesTarget > 0 ? [["📤 Shares Target", `${eng.sharesTarget.toLocaleString()} (${sharesRatio}%)`]] : []),
                ...(commentsOn && eng.commentsTarget > 0 ? [["💬 Comments Target", `${eng.commentsTarget.toLocaleString()} (${commentsRatio}%)`]] : []),
              ] : [["Engagement Mode", "⬜ Views only"]]),
            ].map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                <span style={{ color:N.muted, fontWeight:600 }}>{k}</span>
                <span style={{ fontWeight:800, color:N.text, textAlign:"right" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ borderRadius:16, padding:18, background:N.bg, boxShadow:N.inset, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="checkbox" id="saveTemp" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} style={{ width:16, height:16, accentColor:N.accent, cursor:"pointer" }} />
              <label htmlFor="saveTemp" style={{ fontSize:13, fontWeight:700, color:N.text, cursor:"pointer" }}>💾 Save S-Curve configuration as template</label>
            </div>
            {saveAsTemplate && (
              <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Viral Reels 5-Day Pacing"
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, fontSize:13, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.raisedSm }}
                className="neo-input" />
            )}
          </div>

          {panels.length === 0 && (
            <div style={{ padding:12, borderRadius:12, background:"rgba(220,38,38,0.1)", color:"#dc2626", fontSize:12, fontWeight:700, border:"1px solid rgba(220,38,38,0.2)" }}>
              ⚠️ No connected SMM providers. <Link href="/panels" style={{ textDecoration:"underline", color:"#dc2626" }}>Connect a panel in Settings first</Link>
            </div>
          )}

          {error && <p style={{ fontSize:13, color:"#dc2626", margin:0, fontWeight:700 }}>{error}</p>}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <button onClick={() => setStep(3)} style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }} className="neo-btn">← Back</button>
            <button onClick={submit} disabled={submitting || panels.length === 0} className="neo-btn"
              style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm, opacity: (submitting || panels.length === 0) ? 0.5 : 1 }}>
              {submitting ? "Deploying…" : "🚀 Start Campaign"}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Mode UI */}
      {mode === "bulk" && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.3s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>Bulk CSV Importer</h2>
            <button onClick={downloadSampleCSV} className="neo-btn"
              style={{ border:"none", background:"none", fontSize:12, fontWeight:800, color:N.accent, cursor:"pointer" }}>
              📥 Download Sample CSV
            </button>
          </div>

          <div onClick={() => document.getElementById("csvFile")?.click()}
            style={{ padding:"32px 16px", borderRadius:18, border:"2px dashed #cbd5e1", background:N.bg, boxShadow:N.inset, textAlign:"center", cursor:"pointer" }}>
            <input type="file" id="csvFile" accept=".csv" onChange={handleCSVUpload} style={{ display:"none" }} />
            <div style={{ fontSize:32, marginBottom:10 }}>📁</div>
            <p style={{ fontSize:13, fontWeight:800, color:N.text, margin:0 }}>{bulkFile ? bulkFile.name : "Select or drag & drop CSV file"}</p>
            <p style={{ fontSize:11, color:N.muted, margin:"4px 0 0", fontWeight:600 }}>CSV columns must match the template header format</p>
          </div>

          {bulkError && <p style={{ fontSize:12, color:"#dc2626", margin:0, fontWeight:700 }}>{bulkError}</p>}

          {bulkRows.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ maxHeight:200, overflowY:"auto", borderRadius:12, background:N.bg, boxShadow:N.inset, fontSize:12 }}>
                <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
                  <thead style={{ background:N.bg, borderBottom:`1px solid ${N.border}`, position:"sticky", top:0 }}>
                    <tr style={{ color:N.muted, fontWeight:800 }}>
                      <th style={{ padding:"8px 12px" }}>Row</th>
                      <th style={{ padding:"8px 12px" }}>Link</th>
                      <th style={{ padding:"8px 12px" }}>Plat</th>
                      <th style={{ padding:"8px 12px" }}>Views</th>
                      <th style={{ padding:"8px 12px" }}>Days</th>
                      <th style={{ padding:"8px 12px" }}>Valid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map(r => (
                      <tr key={r.id} style={{ borderBottom:`1px solid ${N.border}` }}>
                        <td style={{ padding:"8px 12px", color:N.muted }}>{r.id}</td>
                        <td style={{ padding:"8px 12px", color:N.text, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.url}</td>
                        <td style={{ padding:"8px 12px", color:N.muted }}>{r.platform}</td>
                        <td style={{ padding:"8px 12px", color:N.text, fontWeight:700 }}>{r.viewsVal.toLocaleString()}</td>
                        <td style={{ padding:"8px 12px", color:N.muted }}>{r.durDays}d</td>
                        <td style={{ padding:"8px 12px", fontWeight:800, color: r.isValid ? "#16a34a" : "#dc2626" }}>{r.isValid ? "✓" : "✗"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize:12, color:N.muted, fontWeight:600 }}>
                Campaigns ready to schedule: <strong style={{ color:N.text }}>{bulkRows.filter(r => r.isValid).length}</strong> of {bulkRows.length}
              </div>

              {bulkProgress && (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:N.muted, fontWeight:700 }}>
                    <span>Deploying campaigns…</span>
                    <span>{bulkProgress.current} / {bulkProgress.total}</span>
                  </div>
                  <div style={{ height:6, borderRadius:10, background:N.bg, boxShadow:N.inset, overflow:"hidden" }}>
                    <div style={{ height:"100%", background:N.accentBg, width:`${(bulkProgress.current / bulkProgress.total) * 100}%`, transition:"width 0.2s" }} />
                  </div>
                </div>
              )}

              {bulkSuccess && (
                <div style={{ padding:12, borderRadius:12, background:"rgba(22,163,74,0.1)", color:"#16a34a", fontSize:12, fontWeight:700, border:"1px solid rgba(22,163,74,0.2)" }}>
                  🎉 Bulk campaigns successfully deployed! Redirecting to dashboard…
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <button onClick={() => { setBulkFile(null); setBulkRows([]); }} style={{ padding:"10px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }} className="neo-btn">Clear</button>
                <button onClick={triggerBulkCampaigns} disabled={submitting || bulkRows.filter(r => r.isValid).length === 0 || bulkSuccess} className="neo-btn"
                  style={{ padding:"10px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm, opacity: (submitting || bulkRows.filter(r => r.isValid).length === 0 || bulkSuccess) ? 0.5 : 1 }}>
                  {submitting ? "Deploying…" : "🚀 Start Bulk Campaigns"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
